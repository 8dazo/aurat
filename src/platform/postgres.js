import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { and, eq, desc, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { records, deliveries, jobs } from "./postgres-schema.js";

export const migrationOptions = {
  migrationsFolder: fileURLToPath(
    new URL("../../migrations/postgres", import.meta.url),
  ),
  migrationsSchema: "aurat",
  migrationsTable: "_migrations",
};
export class PostgresStore {
  constructor(db, close = async () => {}) {
    this.db = db;
    this.close = close;
    this.kind = "postgres";
  }
  async list(kind) {
    return (
      await this.db
        .select({ data: records.data })
        .from(records)
        .where(eq(records.kind, kind))
        .orderBy(desc(records.createdAt), desc(records.id))
    ).map((r) => r.data);
  }
  async get(kind, id) {
    return (
      (
        await this.db
          .select({ data: records.data })
          .from(records)
          .where(and(eq(records.kind, kind), eq(records.id, id)))
          .limit(1)
      )[0]?.data ?? null
    );
  }
  async put(kind, value) {
    await this.db
      .insert(records)
      .values({ kind, id: value.id, data: value, createdAt: value.createdAt })
      .onConflictDoUpdate({
        target: [records.kind, records.id],
        set: { data: value },
      });
    return value;
  }
  async putIfAbsent(kind, value) {
    const inserted = await this.db
      .insert(records)
      .values({ kind, id: value.id, data: value, createdAt: value.createdAt })
      .onConflictDoNothing()
      .returning({ id: records.id });
    return {
      created: inserted.length === 1,
      value: inserted.length ? value : await this.get(kind, value.id),
    };
  }
  async enqueue(data, deliveryId) {
    const job = {
      ...data,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    return this.db.transaction(async (tx) => {
      if (deliveryId) {
        const inserted = await tx
          .insert(deliveries)
          .values({ id: deliveryId, receivedAt: job.createdAt })
          .onConflictDoNothing()
          .returning({ id: deliveries.id });
        if (!inserted.length) return { duplicate: true };
      }
      await tx
        .insert(jobs)
        .values({ id: job.id, data: job, createdAt: job.createdAt });
      return job;
    });
  }
  async claim(now = Date.now()) {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`UPDATE aurat.jobs SET state='failed',error='Worker lease expired after three attempts' WHERE state='running' AND lease_until<=${now} AND attempts>=3`,
      );
      const result = await tx.execute(sql`WITH candidate AS (
        SELECT id FROM aurat.jobs WHERE attempts<3 AND (state='pending' OR (state='running' AND lease_until<=${now}))
        ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT 1
      ) UPDATE aurat.jobs j SET state='running',attempts=j.attempts+1,lease_until=${now + 60000}
        FROM candidate c WHERE j.id=c.id RETURNING j.data,j.attempts`);
      const row = result.rows[0];
      return row ? { ...row.data, attempts: row.attempts } : null;
    });
  }
  async finish(id, result, error, attempt) {
    await this.db
      .update(jobs)
      .set({
        state: error ? "failed" : "completed",
        result: result ?? null,
        error: error ?? null,
        leaseUntil: 0,
      })
      .where(
        and(
          eq(jobs.id, id),
          eq(jobs.state, "running"),
          ...(attempt === undefined ? [] : [eq(jobs.attempts, attempt)]),
        ),
      );
  }
  async jobs() {
    return (
      await this.db
        .select()
        .from(jobs)
        .orderBy(desc(jobs.createdAt), desc(jobs.id))
        .limit(100)
    ).map((r) => ({
      ...r.data,
      state: r.state,
      attempts: r.attempts,
      result: r.result,
      error: r.error,
    }));
  }
  async assertReady() {
    try {
      await Promise.all([this.db.select().from(records).limit(1),this.db.select().from(deliveries).limit(1),this.db.select().from(jobs).limit(1)]);
    } catch {
      throw new Error(
        "Postgres schema is unavailable. Run npm run platform:migrate with the direct database URL.",
      );
    }
  }
  async importSnapshot(snapshot) {
    if (
      snapshot.version !== 1 ||
      !Array.isArray(snapshot.records) ||
      !Array.isArray(snapshot.deliveries) ||
      !Array.isArray(snapshot.jobs)
    )
      throw Error("Invalid workspace snapshot");
    return this.db.transaction(async (tx) => {
      // Prevent a concurrent writer while checking for an empty target.
      await tx.execute(
        sql`LOCK TABLE aurat.records,aurat.deliveries,aurat.jobs IN ACCESS EXCLUSIVE MODE`,
      );
      const existing = await tx.execute(
        sql`SELECT (SELECT count(*) FROM aurat.records)+(SELECT count(*) FROM aurat.deliveries)+(SELECT count(*) FROM aurat.jobs) AS total`,
      );
      if (Number(existing.rows[0].total))
        throw Error("Import requires an empty Postgres workspace");
      for (const r of snapshot.records)
        await tx
          .insert(records)
          .values({
            kind: r.kind,
            id: r.id,
            data: r.data,
            createdAt: r.created_at,
          });
      for (const r of snapshot.deliveries)
        await tx
          .insert(deliveries)
          .values({ id: r.id, receivedAt: r.received_at });
      for (const r of snapshot.jobs)
        await tx
          .insert(jobs)
          .values({
            id: r.id,
            data: r.data,
            state: r.state,
            attempts: r.attempts,
            leaseUntil: r.state === "running" ? 0 : r.lease_until,
            createdAt: r.created_at,
            result: r.result,
            error: r.error,
          });
      return {
        records: snapshot.records.length,
        deliveries: snapshot.deliveries.length,
        jobs: snapshot.jobs.length,
      };
    });
  }
}
export function connectPostgres(connectionString) {
  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw Error("Set a valid Postgres connection URL");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname ||
    !url.pathname.slice(1)
  )
    throw Error("Set a valid Postgres connection URL");
  // Use the URL's verified TLS configuration; never disable certificate validation.
  const pool = new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
  });
  pool.on("error", () => console.error("Postgres pool connection failed"));
  return new PostgresStore(drizzle(pool), () => pool.end());
}
export async function migratePostgres(store) {
  await migrate(store.db, migrationOptions);
}
