import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
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

test("rate-limit injection bypasses replay and upstream deterministically", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aurat-fault-"));
  let upstreamCalls = 0;
  const upstream = http.createServer((_req, res) => {
    upstreamCalls += 1;
    res.end("should not be called");
  });
  const upstreamPort = await listen(upstream);
  const runtime = await startAuratServer({
    mode: "replay",
    port: 0,
    upstreamBaseUrl: `http://127.0.0.1:${upstreamPort}`,
    storePath: join(dir, "recordings.jsonl"),
    fault: "rate-limit",
  });

  try {
    const response = await fetch(`http://127.0.0.1:${runtime.port}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "gpt-test", messages: [] }),
    });
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("x-aurat-fault"), "rate-limit");
    assert.equal(response.headers.get("retry-after"), "1");
    assert.equal((await response.json()).error.type, "rate_limit_error");
    assert.equal(upstreamCalls, 0);
  } finally {
    await close(runtime.server);
    await close(upstream);
    await rm(dir, { recursive: true, force: true });
  }
});

test("malformed-json injection returns an intentionally broken provider payload", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aurat-fault-"));
  const runtime = await startAuratServer({
    mode: "replay",
    port: 0,
    upstreamBaseUrl: "http://127.0.0.1:1",
    storePath: join(dir, "recordings.jsonl"),
    fault: "malformed-json",
  });

  try {
    const response = await fetch(`http://127.0.0.1:${runtime.port}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "gpt-test", messages: [] }),
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-aurat-fault"), "malformed-json");
    const text = await response.text();
    assert.throws(() => JSON.parse(text));
  } finally {
    await close(runtime.server);
    await rm(dir, { recursive: true, force: true });
  }
});

test("delay injection adds deterministic latency before replay handling", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aurat-fault-"));
  const runtime = await startAuratServer({
    mode: "replay",
    port: 0,
    upstreamBaseUrl: "http://127.0.0.1:1",
    storePath: join(dir, "recordings.jsonl"),
    delayMs: 30,
  });

  try {
    const started = Date.now();
    const response = await fetch(`http://127.0.0.1:${runtime.port}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "gpt-test", messages: [] }),
    });
    const elapsed = Date.now() - started;
    assert.equal(response.status, 409);
    assert.ok(elapsed >= 20, `expected injected delay, observed ${elapsed}ms`);
  } finally {
    await close(runtime.server);
    await rm(dir, { recursive: true, force: true });
  }
});
