import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { RecordingStore } from "./store.js";

test("store appends and finds latest matching recording", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aurat-store-"));
  const path = join(dir, "recordings.jsonl");
  const store = new RecordingStore(path);
  const makeRecording = (body) => ({
    version: 1,
    fingerprint: "abc",
    createdAt: new Date().toISOString(),
    request: { method: "POST", path: "/v1/chat/completions", body: {} },
    response: { status: 200, headers: {}, body },
  });

  try {
    await store.append(makeRecording("first"));
    await store.append(makeRecording("second"));
    assert.equal((await store.find("abc"))?.response.body, "second");
    assert.equal(await store.find("missing"), undefined);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
