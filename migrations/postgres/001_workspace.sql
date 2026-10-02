-- Contract for the future Neon adapter. This is a migration template, not an
-- enabled Postgres runtime. JSONB stores versioned domain objects; credentials
-- remain in server environment variables and never enter these records.
BEGIN;
CREATE TABLE IF NOT EXISTS records (
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (kind, id)
);
CREATE INDEX IF NOT EXISTS records_kind_created ON records(kind, created_at DESC);
CREATE TABLE IF NOT EXISTS deliveries (id TEXT PRIMARY KEY, received_at TIMESTAMPTZ NOT NULL);
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','running','completed','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  lease_until BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  result JSONB,
  error TEXT
);
CREATE INDEX IF NOT EXISTS jobs_pending ON jobs(state, lease_until, created_at);
COMMIT;
