import http from "node:http";
import { Readable } from "node:stream";
import { fingerprintRequest } from "./fingerprint.js";
import { RecordingStore } from "./store.js";

const HOP_BY_HOP_HEADERS = new Set([
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailer", "transfer-encoding", "upgrade", "host", "content-length",
]);

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function parseBody(buffer) {
  if (buffer.length === 0) return null;
  const text = buffer.toString("utf8");
  try { return JSON.parse(text); } catch { return text; }
}

function copyRequestHeaders(req) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (HOP_BY_HOP_HEADERS.has(name.toLowerCase()) || value === undefined) continue;
    headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }
  return headers;
}

function responseHeaders(response) {
  return Object.fromEntries([...response.headers.entries()].filter(([name]) => !HOP_BY_HOP_HEADERS.has(name.toLowerCase())));
}

function writeHeaders(res, headers) {
  for (const [name, value] of Object.entries(headers)) {
    if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase())) res.setHeader(name, value);
  }
}

export function createAuratServer(options) {
  const store = new RecordingStore(options.storePath);

  return http.createServer(async (req, res) => {
    try {
      if (req.url === "/health") {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ ok: true, mode: options.mode }));
        return;
      }

      const method = req.method ?? "GET";
      const path = req.url ?? "/";
      const rawBody = await readRequestBody(req);
      const body = parseBody(rawBody);
      const fingerprint = fingerprintRequest({ method, path, body });

      if (options.mode === "replay") {
        const recording = await store.find(fingerprint);
        if (!recording) {
          res.statusCode = 409;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: { type: "aurat_replay_miss", message: "No recording matched this request.", fingerprint } }));
          return;
        }
        res.statusCode = recording.response.status;
        writeHeaders(res, recording.response.headers);
        res.end(recording.response.body);
        return;
      }

      const upstreamUrl = new URL(path, options.upstreamBaseUrl);
      const upstream = await fetch(upstreamUrl, {
        method,
        headers: copyRequestHeaders(req),
        body: ["GET", "HEAD"].includes(method.toUpperCase()) ? undefined : rawBody,
        redirect: "manual",
      });

      const headers = responseHeaders(upstream);
      res.statusCode = upstream.status;
      writeHeaders(res, headers);

      if (!upstream.body) {
        res.end();
        if (options.mode === "record") {
          await store.append({ version: 1, fingerprint, createdAt: new Date().toISOString(), request: { method, path, body }, response: { status: upstream.status, headers, body: "" } });
        }
        return;
      }

      if (options.mode === "record") {
        const [clientStream, recordStream] = upstream.body.tee();
        void new Response(recordStream).text().then((recordedBody) => store.append({
          version: 1,
          fingerprint,
          createdAt: new Date().toISOString(),
          request: { method, path, body },
          response: { status: upstream.status, headers, body: recordedBody },
        })).catch((error) => console.error("[aurat] failed to persist recording", error));
        Readable.fromWeb(clientStream).pipe(res);
        return;
      }

      Readable.fromWeb(upstream.body).pipe(res);
    } catch (error) {
      res.statusCode = 502;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: { type: "aurat_proxy_error", message: error instanceof Error ? error.message : String(error) } }));
    }
  });
}

export async function startAuratServer(options) {
  const server = createAuratServer(options);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? 4010, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not determine Aurat server port.");
  return { server, port: address.port };
}
