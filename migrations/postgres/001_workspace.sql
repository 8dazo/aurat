-- Managed by Drizzle's migration runner. Application data lives in its own schema.
CREATE SCHEMA IF NOT EXISTS aurat;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS aurat.records (
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (kind, id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS records_kind_created ON aurat.records(kind, created_at DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS aurat.deliveries (id TEXT PRIMARY KEY, received_at TIMESTAMPTZ NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS aurat.jobs (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','running','completed','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  lease_until BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  result JSONB,
  error TEXT
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS jobs_pending ON aurat.jobs(state, lease_until, created_at);
