import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { loadAuratConfig, normalizeConfig } from "./config.js";

test("missing config uses strict matching defaults", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aurat-config-"));
  try {
    assert.deepEqual(await loadAuratConfig(join(dir, "missing.json")), {
      match: { ignoreBodyPaths: [], ignoreQueryParams: [] },
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("config validates and deduplicates matching rules", () => {
  assert.deepEqual(normalizeConfig({ match: { ignoreBodyPaths: ["metadata.id", "metadata.id"], ignoreQueryParams: ["trace"] } }), {
    match: { ignoreBodyPaths: ["metadata.id"], ignoreQueryParams: ["trace"] },
  });
  assert.throws(() => normalizeConfig({ match: { ignoreBodyPaths: "metadata.id" } }), /array of non-empty strings/);
});

test("config loads from disk", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aurat-config-"));
  const path = join(dir, "config.json");
  try {
    await writeFile(path, JSON.stringify({ match: { ignoreBodyPaths: ["metadata.request_id"] } }), "utf8");
    assert.deepEqual(await loadAuratConfig(path), {
      match: { ignoreBodyPaths: ["metadata.request_id"], ignoreQueryParams: [] },
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
