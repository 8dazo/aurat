# SQLite now, Postgres when connected

The control plane has both SQLite and Postgres repository implementations.
Connectors, contracts, CI ingestion and workers use the same interface. No Neon
account or database was provisioned by this change.

## Keep using SQLite

Leave `DATABASE_URL` unset and start `npm run platform:dev`. Existing local data
continues to live in `.aurat/workspace.sqlite`. There is no automatic migration or
reset on startup.

## Connect Neon

When the database connection is available, add these to the ignored root `.env`:

```dotenv
# Application traffic: Neon pooled URL.
DATABASE_URL=<pooled-postgres-url>
# Administrative migration/import: direct non-pooled URL for the same database.
DATABASE_URL_UNPOOLED=<direct-postgres-url>
```

Keep the supplied TLS configuration. The driver does not disable certificate
checks. Never commit either URL or pass it as a command-line argument. Runtime
uses a bounded `pg` pool; Drizzle maps the tables and applies versioned SQL
migrations. The application's tables live in the dedicated `aurat` schema; they
do not take over generic `public.records` or `public.jobs` tables.

Apply on a development Neon branch before production:

```sh
npm run platform:migrate
```

The migration runner requires `DATABASE_URL_UNPOOLED` and rejects Neon `-pooler`
hostnames. It tracks applied SQL migrations, so repeated runs preserve data.
Startup checks for the schema and never runs a database migration automatically.
The old unqualified SQL file was a template, not an enabled runtime migration;
if you manually applied that template, its public-schema data is not moved
automatically. The supported migration source is the local SQLite workspace.

## Preserve local workspace data

1. Stop the local API/worker and back up the SQLite database.
2. Select an empty Postgres workspace on a development branch.
3. Set both URLs to that branch and run:

```sh
npm run platform:import-sqlite
```

This applies migrations and atomically copies domain records, hashed CI
credentials, delivery IDs and durable jobs. It reports row counts, keeps IDs and
timestamps, and refuses a nonempty target. Any failure rolls back the entire data
import; it does not delete the SQLite source. Previously running jobs retain
their attempt count and receive an expired lease so the worker can recover them.
Jobs that already exhausted three attempts become failed. The API's workspace
bearer token still comes from `.aurat/platform.env`; it is not a database record.

Start `npm run platform:dev` afterward. With `DATABASE_URL` set, it chooses
Postgres. `/health` reports the active storage kind and the dashboard displays it.
The development server still binds loopback; this does not enable public Vercel
API traffic or multi-user authentication.

## Worker concurrency

Postgres job claiming uses a transaction and `FOR UPDATE SKIP LOCKED`. Delivery
deduplication and enqueueing happen in one transaction. A worker acknowledgement
must match the job's current attempt, so a stale worker cannot complete a newer
lease. CI report insertion is atomic with a unique deterministic run identity.

Local tests execute SQL against PGlite. The `Postgres workspace integration`
workflow exercises the real `pg` pool and concurrent claims against Postgres 17.
The native test accepts only the disposable `aurat_test` database; never point
integration tests at production.

## Still required for hosted production

- User/team authentication and authorization; the current server is one private workspace.
- Vercel API service routing and runtime pool lifecycle integration.
- A hosted worker/scheduler; the development process uses an embedded worker.
- Trace connector credentials, retention, audit logging and managed secret rotation.

References: [Neon connections](https://neon.com/docs/connect/choose-connection),
[pg transactions](https://node-postgres.com/features/transactions),
[Drizzle migrations](https://orm.drizzle.team/docs/migrations).
