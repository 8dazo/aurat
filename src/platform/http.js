import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { InputError, text } from "./service.js";
import { handleMcp, versions } from "./mcp.js";
import { parseReport } from "./report.js";

const equal = (a, b) => {
  const x = Buffer.from(a ?? ""),
    y = Buffer.from(b ?? "");
  return x.length === y.length && timingSafeEqual(x, y);
};
async function body(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1048576) throw new InputError("Limit: 1 MiB per request", 413);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
export function handler(service, { token, allowedOrigins = [] }) {
  if (typeof token !== "string" || token.length < 32)
    throw new Error(
      "AURAT_WORKSPACE_TOKEN must contain at least 32 characters",
    );
  const origins = new Set(allowedOrigins);
  return async (req, res) => {
    const reply = (value, status = 200) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(value === null ? "" : JSON.stringify(value));
    };
    try {
      // Never trust Host for origin allowlisting. Explicit origins prevent DNS rebinding.
      const origin = req.headers.origin;
      if (origin && !origins.has(origin))
        throw new InputError("Origin is not allowed", 403);
      if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
      }
      const path = new URL(req.url, "http://request.invalid").pathname.replace(
        /\/$/,
        "",
      );
      if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader(
          "Access-Control-Allow-Headers",
          "Authorization, Content-Type, MCP-Protocol-Version",
        );
        return reply(null, 204);
      }
      if (req.method === "GET" && path === "/health")
        return reply({
          ok: true,
          storage: "sqlite",
          scope: "single-workspace-development",
        });
      if (path.startsWith("/api/webhooks/github/")) {
        if (req.method !== "POST")
          throw new InputError("Method not allowed", 405);
        const secret = service.env.AURAT_GITHUB_WEBHOOK_SECRET;
        if (!secret) throw new InputError("Webhook is not configured", 503);
        const raw = await body(req);
        const signature =
          "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
        if (!equal(req.headers["x-hub-signature-256"], signature))
          throw new InputError("Invalid webhook signature", 401);
        const id = path.split("/").at(-1);
        const trigger = await service.store.get("triggers", id);
        if (!trigger?.enabled || trigger.type !== "github-webhook")
          throw new InputError("Webhook trigger not found", 404);
        const event = req.headers["x-github-event"];
        if (event === "ping") return reply({ ok: true });
        if (!["push", "pull_request"].includes(event))
          return reply({ ignored: true }, 202);
        const payload = JSON.parse(raw.toString());
        if (
          event === "pull_request" &&
          !["opened", "synchronize", "reopened"].includes(payload.action)
        )
          return reply({ ignored: true }, 202);
        const project = await service.project(trigger.projectId);
        if (
          `https://github.com/${payload.repository?.full_name}`.toLowerCase() !==
          project.repository.toLowerCase()
        )
          throw new InputError("Repository does not match trigger", 403);
        const delivery = text(
          req.headers["x-github-delivery"],
          "delivery",
          200,
        );
        const revision =
          event === "push" ? payload.after : payload.pull_request?.head?.sha;
        if (
          typeof revision !== "string" ||
          !/^[a-f0-9]{40,64}$/i.test(revision)
        )
          throw new InputError("Invalid revision");
        return reply(
          await service.fire(
            id,
            { event, revision },
            `github:${id}:${delivery}`,
          ),
          202,
        );
      }
      if (!equal(req.headers.authorization, `Bearer ${token}`))
        throw new InputError("Workspace token required", 401);
      if (path === "/mcp") {
        if (req.method !== "POST") {
          res.setHeader("Allow", "POST");
          throw new InputError("MCP SSE streams are not offered", 405);
        }
        const version = req.headers["mcp-protocol-version"];
        if (version && !versions.includes(version))
          throw new InputError("Unsupported MCP protocol version");
        const accept = req.headers.accept ?? "";
        if (
          !accept.includes("application/json") ||
          !accept.includes("text/event-stream")
        )
          throw new InputError(
            "Accept must include application/json and text/event-stream",
            406,
          );
      }
      if (req.method === "GET") {
        if (path === "/api/workspace") return reply(await service.workspace());
        const kind = {
          "/api/connections": "connections",
          "/api/contracts": "contracts",
          "/api/triggers": "triggers",
        }[path];
        if (kind) return reply(await service.store.list(kind));
        if (path === "/api/jobs") return reply(await service.store.jobs());
        throw new InputError("Route not found", 404);
      }
      if (req.method !== "POST")
        throw new InputError("Method not allowed", 405);
      if (!req.headers["content-type"]?.startsWith("application/json"))
        throw new InputError("Expected application/json", 415);
      const input = JSON.parse((await body(req)).toString());
      if (!input || typeof input !== "object" || Array.isArray(input))
        throw new InputError("Expected a JSON object");
      if (path === "/mcp") {
        const result = await handleMcp(service, input);
        return reply(result, result === null ? 202 : 200);
      }
      if (path === "/api/workspace") {
        if (input.action === "project")
          return reply(await service.createProject(input), 201);
        if (input.action === "import") {
          await service.project(input.projectId);
          const run = {
            id: randomUUID(),
            projectId: input.projectId,
            label: text(input.label, "label"),
            report: parseReport(input.report),
            createdAt: new Date().toISOString(),
          };
          return reply(await service.store.put("runs", run), 201);
        }
        if (input.action === "baseline") {
          const run = await service.store.get(
            "runs",
            text(input.runId, "runId"),
          );
          if (!run) throw new InputError("Run not found", 404);
          if (!run.report.ok) throw new InputError("Baseline must pass");
          const project = await service.project(run.projectId);
          project.baselineId = run.id;
          await service.store.put("projects", project);
          return reply({ ok: true });
        }
        throw new InputError("Unknown action");
      }
      if (path === "/api/connections")
        return reply(await service.connect(input), 201);
      const sync = path.match(/^\/api\/connections\/([^/]+)\/sync$/);
      if (sync) return reply(await service.syncConnection(sync[1]));
      if (path === "/api/ingest/otel")
        return reply(await service.ingest(input), 201);
      const otlp = path.match(/^\/api\/ingest\/otel\/([^/]+)\/v1\/traces$/);
      if (otlp) {
        const result = await service.ingest({
          projectId: otlp[1],
          document: input,
        });
        return reply(
          result.imported === result.scanned
            ? {}
            : {
                partialSuccess: {
                  rejectedSpans: String(result.scanned - result.imported),
                  errorMessage: JSON.stringify(result.skipped),
                },
              },
        );
      }
      if (path === "/api/contracts")
        return reply(await service.createContract(input), 201);
      if (path === "/api/verify")
        return reply(await service.verify(input), 201);
      if (path === "/api/triggers")
        return reply(await service.createTrigger(input), 201);
      const match = path.match(/^\/api\/triggers\/([^/]+)\/fire$/);
      if (match) return reply(await service.fire(match[1]), 202);
      throw new InputError("Route not found", 404);
    } catch (e) {
      if (e instanceof SyntaxError)
        return reply({ error: "Invalid JSON" }, 400);
      reply(
        { error: e instanceof InputError ? e.message : "Operation failed" },
        e instanceof InputError ? e.status : 500,
      );
    }
  };
}
