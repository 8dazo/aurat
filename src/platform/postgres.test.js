import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import {
  PostgresStore,
  connectPostgres,
  migratePostgres,
  migrationOptions,
} from "./postgres.js";
import { WorkspaceStore } from "./storage.js";
import { PlatformService } from "./service.js";
import { issueCiToken, receiveCiReport } from "./ci.js";
import { openStore } from "./database.js";

test("Postgres migration, SQLite handoff, CRUD, unique delivery, leased worker and CI deduplication", async () => {
  let store;
  if (process.env.TEST_DATABASE_URL) {
    const testUrl = new URL(process.env.TEST_DATABASE_URL);
    if (
      testUrl.pathname !== "/aurat_test" ||
      !["localhost", "127.0.0.1"].includes(testUrl.hostname)
    )
      throw Error(
        "Native integration tests require the disposable aurat_test database",
      );
    store = connectPostgres(process.env.TEST_DATABASE_URL);
    await migratePostgres(store);
    await migratePostgres(store);
  } else {
    const pg = new PGlite();
    const db = drizzle(pg);
    await migrate(db, migrationOptions);
    await migrate(db, migrationOptions);
    store = new PostgresStore(db, () => pg.close());
  }
  const sqlite = new WorkspaceStore(":memory:");
  try {
    const local = new PlatformService(sqlite);
    const project = await local.createProject({
      name: "Migrated project",
      repository: "https://github.com/8dazo/aurat",
    });
    const queued = await sqlite.enqueue(
      { projectId: project.id },
      "before-migration",
    );
    const counts = await store.importSnapshot(await sqlite.exportSnapshot());
    assert.deepEqual(counts, { records: 1, deliveries: 1, jobs: 1 });
    assert.equal(
      (await store.get("projects", project.id)).name,
      "Migrated project",
    );
    await assert.rejects(
      () =>
        store.importSnapshot({
          version: 1,
          records: [],
          deliveries: [],
          jobs: [],
        }),
      /empty Postgres workspace/,
    );
    assert.equal((await store.enqueue({}, "before-migration")).duplicate, true);
    const claimed = await store.claim(0);
    assert.equal(claimed.id, queued.id);
    // A stale attempt cannot acknowledge a newer lease.
    const recovered = await store.claim(60001);
    assert.equal(recovered.attempts, 2);
    await store.finish(recovered.id, { ok: true }, null, 1);
    assert.equal((await store.jobs())[0].state, "running");
    await store.finish(recovered.id, { ok: true }, null, 2);
    assert.equal((await store.jobs())[0].state, "completed");
    const requests = await Promise.all(
      Array.from({ length: 8 }, () =>
        store.enqueue({ projectId: project.id }, "concurrent-delivery"),
      ),
    );
    assert.equal(requests.filter((r) => !r.duplicate).length, 1);
    const claims = await Promise.all(
      Array.from({ length: 8 }, () => store.claim()),
    );
    assert.equal(claims.filter(Boolean).length, 1);
    await store.finish(claims.find(Boolean).id, null, "Expected error", 1);
    const service = new PlatformService(store);
    const ci = await issueCiToken(service, { projectId: project.id });
    const input = {
      projectId: project.id,
      ci: {
        provider: "github-actions",
        repository: "8dazo/aurat",
        runId: "1",
        runAttempt: "1",
        job: "gate",
        reportKey: "node24",
      },
      report: {
        version: 1,
        lane: "offline-application",
        revision: "a".repeat(40),
        createdAt: new Date().toISOString(),
        ok: true,
        scenarios: [
          { id: "tested", status: "PASS", durationMs: 1, failures: [] },
        ],
      },
    };
    const saved = await Promise.all(
      Array.from({ length: 8 }, () => receiveCiReport(service, ci, input)),
    );
    assert.equal(saved.filter((r) => !r.duplicate).length, 1);
    assert.equal((await store.list("runs")).length, 1);
    const p = await service.project(project.id);
    p.name = "Updated";
    await store.put("projects", p);
    assert.equal((await store.get("projects", p.id)).name, "Updated");
  } finally {
    sqlite.close();
    await store.close();
  }
});
test("failed SQLite import rolls back all Postgres rows", async () => {
  const pg = new PGlite();
  const db = drizzle(pg);
  await migrate(db, migrationOptions);
  const store = new PostgresStore(db, () => pg.close());
  try {
    const record = {
      kind: "projects",
      id: "same",
      data: { id: "same" },
      created_at: new Date().toISOString(),
    };
    await assert.rejects(() =>
      store.importSnapshot({
        version: 1,
        records: [record, record],
        deliveries: [],
        jobs: [],
      }),
    );
    assert.equal((await store.list("projects")).length, 0);
  } finally {
    await store.close();
  }
});
test("Vercel requires persistent storage and invalid URL errors do not expose credentials", async () => {
  await assert.rejects(() => openStore({ VERCEL: "1" }), /DATABASE_URL/);
  assert.throws(
    () => connectPostgres("https://user:private-secret@example.com/db"),
    (e) => !e.message.includes("private-secret"),
  );
});
