import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fingerprintRequest } from "./fingerprint.js";
import { startAuratServer } from "./server.js";

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
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { id: "aurat-recorded", choices: [] });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(dir, { recursive: true, force: true });
  }
});

test("replay mode returns a deterministic miss", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aurat-server-"));
  const { server, port } = await startAuratServer({ mode: "replay", port: 0, upstreamBaseUrl: "http://127.0.0.1:1", storePath: join(dir, "recordings.jsonl") });

  try {
    const response = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "gpt-test", messages: [] }),
    });
    assert.equal(response.status, 409);
    const json = await response.json();
    assert.equal(json.error.type, "aurat_replay_miss");
    assert.equal(json.error.fingerprint.length, 64);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(dir, { recursive: true, force: true });
  }
});
