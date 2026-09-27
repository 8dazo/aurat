import { once } from "node:events";
import http from "node:http";
import { Readable } from "node:stream";
import { setTimeout as sleep } from "node:timers/promises";
import { getFaultProfile } from "./faults.js";
import { fingerprintRequest } from "./fingerprint.js";
import { RecordingStore } from "./store.js";

const HOP_BY_HOP_HEADERS = new Set([
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailer", "transfer-encoding", "upgrade", "host", "content-length",
  "content-encoding",
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

function copyRequestHeaders(req, upstreamApiKey) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (HOP_BY_HOP_HEADERS.has(name.toLowerCase()) || value === undefined) continue;
    headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }
  if (upstreamApiKey) headers.set("authorization", `Bearer ${upstreamApiKey}`);
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

function upstreamUrl(baseUrl, requestPath) {
  const base = new URL(baseUrl);
  const incoming = new URL(requestPath, "http://aurat.local");
  const basePath = base.pathname.replace(/\/$/, "");

  if (!basePath || basePath === "/" || incoming.pathname.startsWith(`${basePath}/`) || incoming.pathname === basePath) {
    base.pathname = incoming.pathname;
  } else {
    base.pathname = `${basePath}/${incoming.pathname.replace(/^\//, "")}`;
  }
  base.search = incoming.search;
  return base;
}

function encodeBody(buffer) {
  return { body: buffer.toString("base64"), bodyEncoding: "base64" };
}

function decodeBody(response) {
  if (response.bodyEncoding === "base64") return Buffer.from(response.body ?? "", "base64");
  return Buffer.from(response.body ?? "", "utf8");
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function streamAndRecord(body, res) {
  const chunks = [];
  for await (const chunk of Readable.fromWeb(body)) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    chunks.push(buffer);
    if (!res.write(buffer)) await once(res, "drain");
  }
  return Buffer.concat(chunks);
}

function injectFault(res, fault, fingerprint, mode) {
  if (fault.disconnect) {
    res.destroy(new Error("Aurat injected a connection reset"));
    return;
  }

  res.statusCode = fault.status;
  writeHeaders(res, fault.headers ?? {});
  res.setHeader("x-aurat-mode", mode);
  res.setHeader("x-aurat-replay", "bypass");
  res.setHeader("x-aurat-fingerprint", fingerprint);
  res.setHeader("x-aurat-fault", fault.name);
  res.end(fault.body ?? "");
}

export function createAuratServer(options) {
  const store = new RecordingStore(options.storePath);
  const matching = options.matching ?? {};
  const fault = getFaultProfile(options.fault);
  const delayMs = options.delayMs ?? 0;
  if (!Number.isFinite(delayMs) || delayMs < 0) throw new Error("Aurat delayMs must be a non-negative number");

  return http.createServer(async (req, res) => {
    try {
      const path = req.url ?? "/";
      if (req.method === "GET" && (path === "/health" || path === "/_aurat/health")) {
        json(res, 200, { ok: true, mode: options.mode, upstream: options.upstreamBaseUrl, fault: fault?.name ?? null, delayMs });
        return;
      }

      const method = req.method ?? "GET";
      const rawBody = await readRequestBody(req);
      const body = parseBody(rawBody);
      const fingerprint = fingerprintRequest({ method, path, body }, matching);

      if (delayMs > 0) await sleep(delayMs);
      if (fault) {
        injectFault(res, fault, fingerprint, options.mode);
        return;
      }

      if (options.mode === "replay") {
        const recording = await store.find(fingerprint);
        res.setHeader("x-aurat-mode", "replay");
        res.setHeader("x-aurat-fingerprint", fingerprint);
        if (!recording) {
          res.setHeader("x-aurat-replay", "miss");
          json(res, 409, { error: { type: "aurat_replay_miss", message: "No recording matched this request.", fingerprint } });
          return;
        }
        res.statusCode = recording.response.status;
        writeHeaders(res, recording.response.headers);
        res.setHeader("x-aurat-replay", "hit");
        res.end(decodeBody(recording.response));
        return;
      }

      const target = upstreamUrl(options.upstreamBaseUrl, path);
      const upstream = await fetch(target, {
        method,
        headers: copyRequestHeaders(req, options.upstreamApiKey),
        body: ["GET", "HEAD"].includes(method.toUpperCase()) ? undefined : rawBody,
        redirect: "manual",
      });

      const headers = responseHeaders(upstream);
      res.statusCode = upstream.status;
      writeHeaders(res, headers);
      res.setHeader("x-aurat-mode", options.mode);
      res.setHeader("x-aurat-replay", "bypass");
      res.setHeader("x-aurat-fingerprint", fingerprint);

      const recordingBase = {
        version: 2,
        fingerprint,
        createdAt: new Date().toISOString(),
        request: { method, path, body },
        matching: {
          ignoreBodyPaths: matching.ignoreBodyPaths ?? [],
          ignoreQueryParams: matching.ignoreQueryParams ?? [],
        },
      };

      if (!upstream.body) {
        if (options.mode === "record") {
          await store.append({ ...recordingBase, response: { status: upstream.status, headers, ...encodeBody(Buffer.alloc(0)) } });
        }
        res.end();
        return;
      }

      if (options.mode === "record") {
        const recordedBody = await streamAndRecord(upstream.body, res);
        await store.append({
          ...recordingBase,
          response: { status: upstream.status, headers, ...encodeBody(recordedBody) },
        });
        res.end();
        return;
      }

      Readable.fromWeb(upstream.body).pipe(res);
    } catch (error) {
      if (res.headersSent) {
        res.destroy(error instanceof Error ? error : undefined);
        return;
      }
      json(res, 502, { error: { type: "aurat_proxy_error", message: error instanceof Error ? error.message : String(error) } });
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
