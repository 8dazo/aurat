import http, {
  type IncomingHttpHeaders,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createRequestFingerprint, parseBody } from "./fingerprint.js";
import { FileCassetteStore } from "./store.js";
import type { AuratCassette, AuratConfig } from "./types.js";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "content-encoding",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

async function readRequestBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function copyIncomingHeaders(
  headers: IncomingHttpHeaders,
  upstreamApiKey?: string,
): Headers {
  const result = new Headers();

  for (const [name, value] of Object.entries(headers)) {
    const normalized = name.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(normalized) || normalized === "host") continue;
    if (typeof value === "string") result.set(name, value);
    if (Array.isArray(value)) result.set(name, value.join(", "));
  }

  if (upstreamApiKey) {
    result.set("authorization", `Bearer ${upstreamApiKey}`);
  }

  return result;
}

function snapshotHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, name) => {
    if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase())) {
      result[name] = value;
    }
  });
  return result;
}

function applyHeaders(
  response: ServerResponse,
  headers: Record<string, string>,
): void {
  for (const [name, value] of Object.entries(headers)) {
    if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase())) {
      response.setHeader(name, value);
    }
  }
}

function upstreamTarget(upstreamUrl: string, requestPath: string): string {
  const base = new URL(upstreamUrl);
  return new URL(requestPath, `${base.protocol}//${base.host}`).toString();
}

function json(
  response: ServerResponse,
  status: number,
  body: Record<string, unknown>,
): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

async function streamUpstream(
  upstreamResponse: Response,
  response: ServerResponse,
): Promise<Buffer> {
  if (!upstreamResponse.body) {
    response.end();
    return Buffer.alloc(0);
  }

  const recordingCopy = upstreamResponse.clone();
  const recordedBody = recordingCopy.arrayBuffer().then((buffer) => Buffer.from(buffer));

  await pipeline(
    Readable.fromWeb(upstreamResponse.body as import("node:stream/web").ReadableStream),
    response,
  );

  return recordedBody;
}

export function createAuratServer(config: AuratConfig): http.Server {
  const store = new FileCassetteStore(config.cassetteDir);

  return http.createServer(async (request, response) => {
    try {
      const requestPath = request.url ?? "/";

      if (request.method === "GET" && requestPath === "/_aurat/health") {
        json(response, 200, {
          ok: true,
          mode: config.mode,
          upstream: config.upstreamUrl,
        });
        return;
      }

      const body = await readRequestBody(request);
      const method = request.method ?? "GET";
      const fingerprint = createRequestFingerprint(method, requestPath, body);

      if (config.mode === "replay") {
        const cassette = await store.get(fingerprint);

        if (!cassette) {
          response.setHeader("x-aurat-mode", "replay");
          response.setHeader("x-aurat-replay", "miss");
          json(response, 404, {
            error: {
              type: "aurat_replay_miss",
              message: "No recorded interaction matches this request.",
              fingerprint,
            },
          });
          return;
        }

        response.statusCode = cassette.response.status;
        applyHeaders(response, cassette.response.headers);
        response.setHeader("x-aurat-mode", "replay");
        response.setHeader("x-aurat-replay", "hit");
        response.end(Buffer.from(cassette.response.bodyBase64, "base64"));
        return;
      }

      const target = upstreamTarget(config.upstreamUrl, requestPath);
      const upstreamResponse = await fetch(target, {
        method,
        headers: copyIncomingHeaders(request.headers, config.upstreamApiKey),
        body: method === "GET" || method === "HEAD" || body.length === 0 ? undefined : body,
        redirect: "manual",
      });

      response.statusCode = upstreamResponse.status;
      const responseHeaders = snapshotHeaders(upstreamResponse.headers);
      applyHeaders(response, responseHeaders);
      response.setHeader("x-aurat-mode", config.mode);
      response.setHeader("x-aurat-replay", "bypass");

      if (config.mode === "record") {
        const recordedBody = await streamUpstream(upstreamResponse, response);
        const cassette: AuratCassette = {
          version: 1,
          fingerprint,
          recordedAt: new Date().toISOString(),
          request: {
            method: method.toUpperCase(),
            path: requestPath,
            body: parseBody(body),
          },
          response: {
            status: upstreamResponse.status,
            headers: responseHeaders,
            bodyBase64: recordedBody.toString("base64"),
          },
          metadata: {
            upstreamUrl: target,
          },
        };
        await store.put(cassette);
        return;
      }

      await streamUpstream(upstreamResponse, response);
    } catch (error) {
      if (!response.headersSent) {
        json(response, 502, {
          error: {
            type: "aurat_proxy_error",
            message: error instanceof Error ? error.message : "Unknown proxy error",
          },
        });
      } else {
        response.destroy(error instanceof Error ? error : undefined);
      }
    }
  });
}
