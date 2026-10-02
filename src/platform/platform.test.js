import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHmac } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { WorkspaceStore } from "./storage.js";
import { PlatformService } from "./service.js";
import { handler } from "./http.js";
import { handleMcp } from "./mcp.js";
const token = "test-workspace-token-at-least-32-characters";
const secret = "test-webhook-secret";
function document(tool = "search_docs") {
  return {
    resourceSpans: [
      {
        scopeSpans: [
          {
            spans: [
              {
                traceId: "trace-1",
                spanId: "span-1",
                attributes: {
                  "gen_ai.request.model": "test-model",
                  "gen_ai.operation.name": "chat",
                  "gen_ai.input.messages": [
                    {
                      role: "user",
                      parts: [{ type: "text", content: "Find a policy" }],
                    },
                  ],
                  "gen_ai.output.messages": [
                    {
                      role: "assistant",
                      parts: [
                        {
                          type: "tool_call",
                          id: "call-1",
                          name: tool,
                          arguments: { q: "policy" },
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  };
}
async function setup(t, filename = ":memory:") {
  const store = new WorkspaceStore(filename);
  let calls = 0;
  const service = new PlatformService(store, {
    env: {
      AURAT_GITHUB_TOKEN: "not-persisted",
      AURAT_GITHUB_WEBHOOK_SECRET: secret,
    },
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(options.headers.Authorization, "Bearer not-persisted");
      if (url.endsWith("/actions/runs?per_page=20"))
        return Response.json({
          workflow_runs: [
            {
              id: 1,
              name: "Regression suite",
              status: "completed",
              conclusion: "success",
              head_sha: "a".repeat(40),
              html_url: "https://github.com/8dazo/aurat/actions/runs/1",
              created_at: new Date().toISOString(),
            },
          ],
        });
      assert.equal(url, "https://api.github.com/repos/8dazo/aurat");
      return Response.json({
        full_name: "8dazo/aurat",
        default_branch: "main",
        private: false,
      });
    },
  });
  const server = createServer(
    handler(service, { token, allowedOrigins: ["http://localhost:3000"] }),
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    store.close();
  });
  const base = "http://127.0.0.1:" + server.address().port;
  const call = async (path, body, headers = {}) => {
    const r = await fetch(base + path, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const raw = await r.text();
    return { status: r.status, value: raw ? JSON.parse(raw) : null };
  };
  const project = (
    await call("/api/workspace", {
      action: "project",
      name: "Test agent",
      repository: "https://github.com/8dazo/aurat",
    })
  ).value;
  return {
    store,
    service,
    base,
    call,
    project,
    get calls() {
      return calls;
    },
  };
}
async function contractFor(ctx) {
  await ctx.call("/api/ingest/otel", {
    projectId: ctx.project.id,
    document: document(),
  });
  return (await ctx.call("/api/contracts", { projectId: ctx.project.id }))
    .value;
}

test("real API flow: project, connector, OTLP, inferred contract, passing run and changed tool failure", async (t) => {
  const c = await setup(t);
  assert.equal(
    (
      await c.call("/api/connections", {
        projectId: c.project.id,
        type: "github",
      })
    ).status,
    201,
  );
  assert.equal(c.calls, 1);
  assert.equal(
    (
      await c.call("/api/connections", {
        projectId: c.project.id,
        type: "github",
      })
    ).status,
    409,
  );
  assert.equal(
    JSON.stringify(await c.store.list("connections")).includes("not-persisted"),
    false,
  );
  const contract = await contractFor(c);
  const passing = await c.call("/api/verify", {
    projectId: c.project.id,
    contractId: contract.id,
  });
  assert.equal(passing.value.report.ok, true);
  assert.equal(passing.value.report.lane, "stored-trace-contract");
  await c.call("/api/ingest/otel", {
    projectId: c.project.id,
    document: document("delete_docs"),
  });
  const failing = await c.call("/api/verify", {
    projectId: c.project.id,
    contractId: contract.id,
  });
  assert.equal(failing.value.report.ok, false);
  assert.ok(
    failing.value.report.scenarios[0].failures.some(
      (f) => f.field === "toolCalls",
    ),
  );
  assert.equal(
    (
      await c.call("/api/workspace", {
        action: "baseline",
        runId: failing.value.id,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await c.call("/api/workspace", {
        action: "baseline",
        runId: passing.value.id,
      })
    ).status,
    200,
  );
  assert.equal(c.calls, 1, "verification never calls a provider");
});
test("auth, origin, input and payload limits protect the private API", async (t) => {
  const c = await setup(t);
  assert.equal(
    (await c.call("/api/workspace", null, { Authorization: "" })).status,
    401,
  );
  assert.equal(
    (await c.call("/api/workspace", null, { Origin: "https://evil.example" }))
      .status,
    403,
  );
  assert.equal(
    (await c.call("/api/workspace", null, { Origin: "http://localhost:3000" }))
      .status,
    200,
  );
  assert.equal(
    (
      await c.call("/api/workspace", {
        action: "project",
        name: "x",
        repository: "http://127.0.0.1",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await c.call("/api/ingest/otel", {
        projectId: "missing",
        document: document(),
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await c.call("/api/ingest/otel", {
        projectId: c.project.id,
        document: { resourceSpans: [{ scopeSpans: [{ spans: [null] }] }] },
      })
    ).status,
    400,
  );
  assert.equal(
    (await c.call("/api/workspace", { padding: "a".repeat(1048576) })).status,
    413,
  );
});
test("GitHub sync fetches and saves actual upstream workflow state", async (t) => {
  const c = await setup(t);
  const connection = (
    await c.call("/api/connections", {
      projectId: c.project.id,
      type: "github",
    })
  ).value;
  const synced = await c.call(`/api/connections/${connection.id}/sync`, {});
  assert.equal(synced.status, 200);
  assert.equal(synced.value.workflowRuns[0].conclusion, "success");
  assert.ok(synced.value.lastSyncedAt);
  assert.equal(c.calls, 2);
});
test("project-scoped collector endpoint returns OTLP JSON partial success", async (t) => {
  const c = await setup(t);
  const result = await c.call(`/api/ingest/otel/${c.project.id}/v1/traces`, {
    spans: [
      ...document().resourceSpans[0].scopeSpans[0].spans,
      { attributes: {} },
    ],
  });
  assert.equal(result.status, 200);
  assert.equal(result.value.partialSuccess.rejectedSpans, "1");
  assert.equal((await c.store.list("batches"))[0].recordings.length, 1);
});
test("OTLP reports unsupported spans and redacts secrets before encoding responses", async (t) => {
  const c = await setup(t);
  const doc = document();
  const attrs = doc.resourceSpans[0].scopeSpans[0].spans[0].attributes;
  attrs["gen_ai.output.messages"] = [
    {
      role: "assistant",
      parts: [{ type: "text", content: "Bearer abcdefghijklm12345" }],
    },
  ];
  await c.call("/api/ingest/otel", { projectId: c.project.id, document: doc });
  const rows = await c.store.list("batches");
  assert.equal(
    Buffer.from(rows[0].recordings[0].response.body, "base64")
      .toString()
      .includes("abcdefghijklm12345"),
    false,
  );
  const skipped = await c.call("/api/ingest/otel", {
    projectId: c.project.id,
    document: { spans: [{ attributes: {} }] },
  });
  assert.equal(skipped.value.imported, 0);
  assert.equal(skipped.value.skipped.missing_model, 1);
});
test("manual triggers queue durable jobs and save real verification results", async (t) => {
  const c = await setup(t);
  const contract = await contractFor(c);
  const trigger = (
    await c.call("/api/triggers", {
      projectId: c.project.id,
      contractId: contract.id,
      type: "manual",
    })
  ).value;
  const job = (await c.call(`/api/triggers/${trigger.id}/fire`, {})).value;
  assert.equal((await c.store.jobs())[0].state, "pending");
  await c.service.workOne();
  assert.equal((await c.store.jobs())[0].state, "completed");
  assert.equal((await c.store.get("runs", job.id)).report.ok, true);
});
test("signed GitHub webhook enforces repository identity and deduplicates delivery transactionally", async (t) => {
  const c = await setup(t);
  const contract = await contractFor(c);
  const trigger = (
    await c.call("/api/triggers", {
      projectId: c.project.id,
      contractId: contract.id,
      type: "github-webhook",
    })
  ).value;
  const payload = {
    repository: { full_name: "8dazo/aurat" },
    after: "a".repeat(40),
  };
  const headers = {
    "x-github-event": "push",
    "x-github-delivery": "delivery-1",
    "x-hub-signature-256":
      "sha256=" +
      createHmac("sha256", secret)
        .update(JSON.stringify(payload))
        .digest("hex"),
    Authorization: "",
  };
  const path = `/api/webhooks/github/${trigger.id}`;
  assert.equal(
    (await c.call(path, payload, { "x-hub-signature-256": "bad" })).status,
    401,
  );
  assert.equal((await c.call(path, payload, headers)).status, 202);
  assert.equal((await c.call(path, payload, headers)).value.duplicate, true);
  assert.equal((await c.store.jobs()).length, 1);
  const foreign = { ...payload, repository: { full_name: "someone/other" } };
  const signed = {
    ...headers,
    "x-hub-signature-256":
      "sha256=" +
      createHmac("sha256", secret)
        .update(JSON.stringify(foreign))
        .digest("hex"),
  };
  assert.equal((await c.call(path, foreign, signed)).status, 403);
});
test("SQLite survives restart and recovers expired jobs without duplicating saved runs", async () => {
  const dir = mkdtempSync(join(tmpdir(), "aurat-platform-"));
  const file = join(dir, "workspace.sqlite");
  let store;
  try {
    store = new WorkspaceStore(file);
    const service = new PlatformService(store);
    const p = await service.createProject({
      name: "Agent",
      repository: "https://github.com/8dazo/aurat",
    });
    await service.ingest({ projectId: p.id, document: document() });
    const contract = await service.createContract({ projectId: p.id });
    const trigger = await service.createTrigger({
      projectId: p.id,
      contractId: contract.id,
      type: "manual",
    });
    const job = await service.fire(trigger.id);
    await store.claim(Date.now() - 120000);
    // Simulate crash after result persistence but before completing the job.
    await service.verify({
      projectId: p.id,
      contractId: contract.id,
      jobId: job.id,
    });
    store.close();
    store = new WorkspaceStore(file);
    await new PlatformService(store).workOne();
    assert.equal((await store.jobs())[0].state, "completed");
    assert.equal((await store.list("runs")).length, 1);
    assert.equal((await store.list("projects"))[0].name, "Agent");
  } finally {
    store?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("expired third worker lease becomes a terminal failure", async () => {
  const store = new WorkspaceStore(":memory:");
  try {
    const job = await store.enqueue({ projectId: "x" });
    await store.claim(0);
    await store.claim(60001);
    await store.claim(120002);
    assert.equal(await store.claim(180003), null);
    assert.equal((await store.jobs())[0].id, job.id);
    assert.equal((await store.jobs())[0].state, "failed");
  } finally {
    store.close();
  }
});
test("MCP initializes, lists actual tools, verifies contracts and rejects unknown arguments", async (t) => {
  const c = await setup(t);
  const contract = await contractFor(c);
  const headers = {
    Accept: "application/json, text/event-stream",
    "MCP-Protocol-Version": "2025-11-25",
  };
  const init = (
    await c.call(
      "/mcp",
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-11-25" },
      },
      headers,
    )
  ).value;
  assert.equal(init.result.protocolVersion, "2025-11-25");
  const listed = (
    await c.call(
      "/mcp",
      { jsonrpc: "2.0", id: 2, method: "tools/list" },
      headers,
    )
  ).value;
  assert.ok(listed.result.tools.some((t) => t.name === "verify_contract"));
  const result = await handleMcp(c.service, {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "verify_contract",
      arguments: { projectId: c.project.id, contractId: contract.id },
    },
  });
  assert.equal(JSON.parse(result.result.content[0].text).report.ok, true);
  const invalid = await handleMcp(c.service, {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: { name: "list_projects", arguments: { token: "nope" } },
  });
  assert.equal(invalid.error.code, -32602);
  assert.equal(
    (
      await c.call(
        "/mcp",
        { jsonrpc: "2.0", method: "notifications/initialized" },
        headers,
      )
    ).status,
    202,
  );
  assert.equal((await c.call("/mcp", null, headers)).status, 405);
});
test("stdio MCP client uses the authenticated HTTP API and writes only JSON-RPC", async (t) => {
  const c = await setup(t);
  const child = spawn(process.execPath, ["src/platform/stdio.js"], {
    env: {
      ...process.env,
      AURAT_API_URL: c.base,
      AURAT_WORKSPACE_TOKEN: token,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  let output = "";
  let stderr = "";
  child.stdout.on("data", (x) => (output += x));
  child.stderr.on("data", (x) => (stderr += x));
  child.stdin.end(
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-11-25" },
    }) +
      "\n" +
      JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "list_projects", arguments: {} },
      }) +
      "\n",
  );
  const [exit] = await once(child, "exit");
  assert.equal(exit, 0, stderr);
  const lines = output.trim().split("\n").map(JSON.parse);
  assert.equal(lines.length, 2);
  assert.equal(JSON.parse(lines[1].result.content[0].text)[0].id, c.project.id);
});
test("application report import validates consistency, sanitizes and persists", async (t) => {
  const c = await setup(t);
  const report = JSON.parse(
    readFileSync(
      new URL("../../apps/platform/lib/after.json", import.meta.url),
    ),
  );
  const imported = await c.call("/api/workspace", {
    action: "import",
    projectId: c.project.id,
    label: "CI result",
    report,
  });
  assert.equal(imported.status, 201);
  assert.equal((await c.call("/api/workspace")).value.runs.length, 1);
  const invalid = { ...report, ok: !report.ok };
  assert.equal(
    (
      await c.call("/api/workspace", {
        action: "import",
        projectId: c.project.id,
        label: "bad",
        report: invalid,
      })
    ).status,
    400,
  );
});
