import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

// The service depends on this repository interface, not SQLite bindings in routes.
// A Postgres implementation can replace it without changing connectors or tools.
export class WorkspaceStore {
  constructor(filename) {
    this.kind = "sqlite";
    if (filename !== ":memory:")
      mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(filename);
    if (filename !== ":memory:") chmodSync(filename, 0o600);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS records (
        kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL,
        created_at TEXT NOT NULL, PRIMARY KEY(kind,id));
      CREATE TABLE IF NOT EXISTS deliveries (id TEXT PRIMARY KEY, received_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY, data TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0, lease_until INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL, result TEXT, error TEXT);
      PRAGMA user_version=1;`);
  }
  async list(kind) {
    return this.db
      .prepare(
        "SELECT data FROM records WHERE kind=? ORDER BY created_at DESC,id DESC",
      )
      .all(kind)
      .map((r) => JSON.parse(r.data));
  }
  async get(kind, id) {
    const row = this.db
      .prepare("SELECT data FROM records WHERE kind=? AND id=?")
      .get(kind, id);
    return row ? JSON.parse(row.data) : null;
  }
  async put(kind, value) {
    this.db
      .prepare(
        `INSERT INTO records VALUES (?,?,?,?)
      ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data`,
      )
      .run(kind, value.id, JSON.stringify(value), value.createdAt);
    return value;
  }
  async enqueue(data, deliveryId) {
    const job = {
      id: randomUUID(),
      ...data,
      createdAt: new Date().toISOString(),
    };
    this.db.exec("BEGIN IMMEDIATE");
    try {
      if (deliveryId) {
        const inserted = this.db
          .prepare("INSERT OR IGNORE INTO deliveries VALUES (?,?)")
          .run(deliveryId, job.createdAt);
        if (!inserted.changes) {
          this.db.exec("COMMIT");
          return { duplicate: true };
        }
      }
      this.db
        .prepare("INSERT INTO jobs (id,data,created_at) VALUES (?,?,?)")
        .run(job.id, JSON.stringify(job), job.createdAt);
      this.db.exec("COMMIT");
      return job;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  async putIfAbsent(kind, value) {
    const result = this.db
      .prepare("INSERT OR IGNORE INTO records VALUES (?,?,?,?)")
      .run(kind, value.id, JSON.stringify(value), value.createdAt);
    return {
      created: !!result.changes,
      value: result.changes ? value : await this.get(kind, value.id),
    };
  }
  async exportSnapshot() {
    this.db.exec("BEGIN");
    try {
      const snapshot = {
        version: 1,
        records: this.db
          .prepare("SELECT * FROM records")
          .all()
          .map((r) => ({ ...r, data: JSON.parse(r.data) })),
        deliveries: this.db.prepare("SELECT * FROM deliveries").all(),
        jobs: this.db
          .prepare("SELECT * FROM jobs")
          .all()
          .map((r) => ({
            ...r,
            data: JSON.parse(r.data),
            result: r.result ? JSON.parse(r.result) : null,
          })),
      };
      this.db.exec("COMMIT");
      return snapshot;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  async claim(now = Date.now()) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db
        .prepare(
          "UPDATE jobs SET state='failed',error='Worker lease expired after three attempts' WHERE state='running' AND lease_until<=? AND attempts>=3",
        )
        .run(now);
      const row = this.db
        .prepare(
          `SELECT * FROM jobs WHERE attempts<3 AND
        (state='pending' OR (state='running' AND lease_until<=?)) ORDER BY created_at,id LIMIT 1`,
        )
        .get(now);
      if (!row) {
        this.db.exec("COMMIT");
        return null;
      }
      this.db
        .prepare(
          "UPDATE jobs SET state='running',attempts=attempts+1,lease_until=? WHERE id=?",
        )
        .run(now + 60000, row.id);
      this.db.exec("COMMIT");
      return { ...JSON.parse(row.data), attempts: row.attempts + 1 };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  async finish(id, result, error, attempt) {
    this.db
      .prepare(
        "UPDATE jobs SET state=?,result=?,error=?,lease_until=0 WHERE id=? AND state='running' AND (? IS NULL OR attempts=?)",
      )
      .run(
        error ? "failed" : "completed",
        result ? JSON.stringify(result) : null,
        error ?? null,
        id,
        attempt ?? null,
        attempt ?? null,
      );
  }
  async jobs() {
    return this.db
      .prepare("SELECT * FROM jobs ORDER BY created_at DESC,id DESC LIMIT 100")
      .all()
      .map((row) => ({
        ...JSON.parse(row.data),
        state: row.state,
        attempts: row.attempts,
        result: row.result ? JSON.parse(row.result) : null,
        error: row.error,
      }));
  }
  close() {
    this.db.close();
  }
}
