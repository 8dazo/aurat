import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fingerprintRequest } from "./fingerprint.js";
import { startAuratServer } from "./server.js";

async function close(server) {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server.address().port;
}

test("replay mode returns a recorded response without upstream calls", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aurat-server-"));
  const storePath = join(dir, "recordings.jsonl");
  const body = { model: "gpt-test", messages: [{ role: "user", content: "hello" }] };
  const recording = {
    version: 1,
    fingerprint: fingerprintRequest({ method: "POST", path: "/v1/chat/completions", body }),
    createdAt: new Date().toISOString(),
    request: { method: "POST", path: "/v1/chat/completions", body },
    response: { status: 200, headers: { "content-type": "application/json" }, body: JSON.stringify({ id: "aurat-recorded", choices: [] }) },
  };
  await writeFile(storePath, `${JSON.stringify(recording)}\n`, "utf8");
  const { server, port } = await startAuratServer({ mode: "replay", port: 0, upstreamBaseUrl: "http://127.0.0.1:1", storePath });

  try {
    const response = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-aurat-replay"), "hit");
    assert.deepEqual(await response.json(), { id: "aurat-recorded", choices: [] });
  } finally {
    await close(server);
    await rm(dir, { recursive: true, force: true });
  }
});

test("replay mode returns a deterministic miss", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aurat-server-"));
  const { server, port } = await startAuratServer({ mode: "replay", port: 0, upstreamBaseUrl: "http://127.0.0.1:1", storePath: join(dir, "recordings.jsonl") });

  try {
    const response = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: "gpt-test", messages: [] }),
    });
    assert.equal(response.status, 409);
    assert.equal(response.headers.get("x-aurat-replay"), "miss");
    const json = await response.json();
    assert.equal(json.error.type, "aurat_replay_miss");
    assert.equal(json.error.fingerprint.length, 64);
  } finally {
    await close(server);
    await rm(dir, { recursive: true, force: true });
  }
});

test("record mode preserves SSE bytes, upstream auth, and provider base paths", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aurat-server-"));
  const storePath = join(dir, "recordings.jsonl");
  let calls = 0;
  let authHeader;
  let upstreamPath;
  const upstream = http.createServer((req, res) => {
    calls += 1;
    authHeader = req.headers.authorization;
    upstreamPath = req.url;
    res.statusCode = 200;
    res.setHeader("content-type", "text/event-stream");
    res.write('data: {"choices":[{"delta":{"content":"hel"}}]}\n\n');
    res.end('data: {"choices":[{"delta":{"content":"lo"}}]}\n\ndata: [DONE]\n\n');
  });
  const upstreamPort = await listen(upstream);
  const recorder = await startAuratServer({
    mode: "record", port: 0, upstreamBaseUrl: `http://127.0.0.1:${upstreamPort}/api`,
    upstreamApiKey: "real-provider-key", storePath,
  });
  const body = { model: "gpt-test", stream: true, messages: [{ role: "user", content: "hello" }] };
  const expected = 'data: {"choices":[{"delta":{"content":"hel"}}]}\n\ndata: {"choices":[{"delta":{"content":"lo"}}]}\n\ndata: [DONE]\n\n';

  try {
    const first = await fetch(`http://127.0.0.1:${recorder.port}/v1/chat/completions`, {
      method: "POST", headers: { "content-type": "application/json", authorization: "Bearer fake-client-key" }, body: JSON.stringify(body),
    });
    assert.equal(await first.text(), expected);
    assert.equal(authHeader, "Bearer real-provider-key");
    assert.equal(upstreamPath, "/api/v1/chat/completions");
    assert.equal(calls, 1);
  } finally {
    await close(recorder.server);
  }

  const replayer = await startAuratServer({ mode: "replay", port: 0, upstreamBaseUrl: "http://127.0.0.1:1", storePath });
  try {
    const second = await fetch(`http://127.0.0.1:${replayer.port}/v1/chat/completions`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    assert.equal(second.headers.get("x-aurat-replay"), "hit");
    assert.equal(await second.text(), expected);
    assert.equal(calls, 1);
  } finally {
    await close(replayer.server);
    await close(upstream);
    await rm(dir, { recursive: true, force: true });
  }
});
