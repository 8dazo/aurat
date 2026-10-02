# From demo workspace to working integrations

Aurat's deterministic replay engine already runs real application scenarios.
The Vercel site initially exported only the public UI and Scout example reports.
This release adds a private, single-workspace development control plane. It does
not turn the exported Vercel site into a hosted multi-user backend.

## What works now

| Area | Implemented behavior | Boundary |
| --- | --- | --- |
| Database | Persistent SQLite or Postgres/Neon adapter, tracked migrations, atomic SQLite import, leased jobs | Hosted API and team authorization still pending |
| Projects | Create projects, import validated application reports, select passing baselines | One workspace per server token |
| GitHub | Repository verification, workflow sync, action replay gate, job summary/artifact, scoped CI report submission | No GitHub App, automatic artifact ingestion or branch-protection configuration |
| OpenTelemetry | Import OTLP JSON model spans, redact supported secrets, retain normalized recordings | JSON only; supported GenAI chat-completion spans need captured input/output messages |
| Contracts | Infer behavioral contracts and verify new stored evidence with the existing engine | Verifies stored traces, not the changed repository application |
| Triggers | Manual jobs and HMAC-signed GitHub push/PR deliveries | Execute stored-trace verification only |
| Worker | Persistent queue, lease recovery, terminal error state, deterministic run ID per job | Embedded worker in a long-lived local Node process; no hosted scheduler |
| MCP | Authenticated JSON Streamable HTTP and local stdio adapter; five real tools | No OAuth, remote MCP-client connector or SSE stream |
| Dashboard | Connect private API, save projects/reports, configure connectors/contracts/triggers, inspect jobs, issue/revoke CI tokens | API tokens stay in browser memory; local HTTP dashboard only |

## Run it

Use Node 24 for the control plane (`node:sqlite`). From the repository root:

```sh
npm ci
npm run platform:init
npm run platform:dev
```

Initialization creates `.aurat/platform.env` with a random 32-byte workspace token
and restrictive permissions. It preserves an existing file. `.aurat/` is ignored
by Git. Do not commit or share the token. The database is
`.aurat/workspace.sqlite`; back up this directory before deleting local data.
Use the SQLite backup API or stop the API before copying database files; WAL
files are part of an active database.

In another terminal:

```sh
cd apps/vercel-platform
npx --yes pnpm@11.25.0 install --frozen-lockfile
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000/app/connections/`. Enter
`http://127.0.0.1:4318` and the token from `.aurat/platform.env`.
Create a project, verify GitHub, sync workflows, import captured OTLP JSON, create
a contract, and verify the evidence. Changed tool names or output structure
produce actual failures. Runs use a query parameter so new IDs work in the static
export. Reloading the page clears the API session and restores the example view.

Environment configuration (put optional values in the ignored root `.env`):

| Variable | Purpose |
| --- | --- |
| `AURAT_WORKSPACE_TOKEN` | Required bearer credential; generated locally by `platform:init` |
| `AURAT_DB_PATH` | SQLite filename, default `.aurat/workspace.sqlite` |
| `AURAT_API_PORT` | API port, default `4318`; binds loopback only |
| `AURAT_ALLOWED_ORIGINS` | Comma-separated exact UI origins; defaults to localhost/127.0.0.1 on port 3000 |
| `AURAT_GITHUB_TOKEN` | Optional server-only token for private repos/rate limits; repository metadata and Actions read permissions |
| `AURAT_GITHUB_WEBHOOK_SECRET` | Required to create signed GitHub webhook triggers |
| `AURAT_API_URL` | API URL for the stdio MCP adapter; defaults to loopback port 4318 |
| `DATABASE_URL` | Optional Postgres runtime URL; selects the Postgres adapter when set |
| `DATABASE_URL_UNPOOLED` | Direct connection for explicit migrations and SQLite import |

Credentials are never stored in connection records. Secret redaction is a baseline,
not complete personal-data detection. Review captured messages before importing.

## API

Every private route requires `Authorization: Bearer <workspace-token>`.
POST bodies use `Content-Type: application/json`, with a 1 MiB limit.
Unknown origins are rejected even with a valid bearer token.

| Route | Method | Input / behavior |
| --- | --- | --- |
| `/api/workspace` | GET | Projects and latest saved reports |
| `/api/workspace` | POST | `{action:"project",name,repository}`, `{action:"import",projectId,label,report}`, `{action:"baseline",runId}` |
| `/api/connections` | GET / POST | List or create `{projectId,type:"github"\|"otlp"}` |
| `/api/connections/:id/sync` | POST | `{}`; fetch real GitHub workflow status |
| `/api/ingest/otel` | POST | `{projectId,document}`; import counts and skip reasons |
| `/api/ingest/otel/:projectId/v1/traces` | POST | Standard OTLP JSON document; OTLP partial-success response |
| `/api/contracts` | GET / POST | List or create `{projectId,name?}` from imported evidence |
| `/api/verify` | POST | `{projectId,contractId,label?,revision?}`; save real contract result |
| `/api/triggers` | GET / POST | List or create `{projectId,contractId,type:"manual"\|"github-webhook"}` |
| `/api/triggers/:id/fire` | POST | `{}`; enqueue a verification job |
| `/api/jobs` | GET | Worker state, result run ID, pass/fail and errors |
| `/api/ci-tokens` | GET / POST | Token metadata or create a project-scoped report upload token |
| `/api/ci-tokens/:id/revoke` | POST | Revoke a CI credential |
| `/api/ci/reports` | POST | Scoped CI token required; ingest and deduplicate real application reports |
| `/api/webhooks/github/:id` | POST | GitHub signed JSON; uses HMAC instead of workspace bearer authentication |
| `/mcp` | POST | MCP JSON-RPC; bearer auth, both JSON/SSE Accept types |

OTLP exporters must send HTTP JSON, include the bearer header, and use the
project-specific `.../v1/traces` endpoint. Protobuf exporters are not supported.
Unsupported/missing-content spans are reported as rejected; they never become
invented recordings. Direct JSON imports return counts so the caller can inspect
what was retained.

GitHub webhook triggers accept `push`, and `pull_request` actions `opened`,
`synchronize`, `reopened`. They validate the signed raw body, repository identity,
revision and delivery ID. Duplicate deliveries enqueue no additional job. The
worker verifies already imported traces and labels the result
`stored-trace-contract`; a PR's revision is context, not proof that its code ran.
Local loopback webhook URLs cannot receive GitHub's internet requests. Public
webhooks will be enabled with the hosted backend and persistent worker.

## MCP client configuration

The local adapter uses the same API; it does not create a second database.
After starting the API, configure a stdio-capable client with:

```json
{
  "mcpServers": {
    "aurat": {
      "command": "node",
      "args": [
        "--env-file=/absolute/path/to/aurat/.aurat/platform.env",
        "/absolute/path/to/aurat/src/platform/stdio.js"
      ],
      "env": {"AURAT_API_URL":"http://127.0.0.1:4318"}
    }
  }
}
```

Tools: `list_projects`, `list_connections`, `list_runs`, `create_contract`,
`verify_contract`. Write tools declare their side effects; unsupported tools and
invalid arguments return errors. HTTP clients use `/mcp` with
`Accept: application/json, text/event-stream`, a bearer token, and the negotiated
`MCP-Protocol-Version`. GET returns 405 because server-pushed SSE is not offered.

## Neon handoff

The Postgres adapter and versioned migration are now implemented. Follow
[Postgres setup and SQLite import](postgres-setup.md) when a Neon connection is
supplied. No cloud database has been provisioned. The remaining hosted steps are:

1. Apply migrations and optionally import SQLite on an isolated development branch.
2. Add a hosted worker/scheduler; the Postgres queue already supports concurrent claims.
3. Add users, team memberships, per-project authorization, credential encryption
   and scoped API keys before exposing workspace writes publicly.
4. Route `/api/*` and `/mcp` to the backend through Vercel Services, retaining the
   frontend's internal binding and moving data access into runtime functions.
5. Verify saved projects, report imports, webhooks and MCP access on the public
   domain. Vercel storage must be Postgres; SQLite cannot be selected there.

A connection string alone does not enable team authentication or a durable worker.

## Project gaps, in delivery order

| Priority | Work | Completion evidence |
| --- | --- | --- |
| 1 | Connect Neon, account/team auth and hosted API/worker | Two users cannot read each other's projects; saves survive redeploy |
| 2 | GitHub App and automatic artifact ingestion | Local/action replay gate and scoped CI upload are implemented; authenticated artifact provenance remains |
| 3 | Langfuse, LangSmith and Braintrust trace connectors | Authenticated trace pagination, provenance, duplicate-safe imports and normalized fixture tests |
| 4 | Outbound MCP client and tool-call capture/replay | Real MCP tool exchange recorded, then replayed offline with argument/order checks |
| 5 | Hosted schedules and bounded live canaries | Real provider checks with explicit call/cost limits and drift evidence |
| 6 | Alerts, retention, audit trail and production monitoring | Failed gates notify the selected destination; old evidence expires by policy |

## Validation and references

Run `npm test` and `npm run platform:test`. Integration tests exercise the actual
HTTP handler, worker and SQLite, including changed tool regressions, authentication,
malformed/oversized input, raw-body HMAC verification, deduplication, restart
recovery, redaction, report import and a spawned stdio MCP client. GitHub unit
tests use a controlled upstream; a separate smoke check verified the public Aurat
repository and fetched real workflow statuses without a token.

See [CI report delivery](ci-report-delivery.md) for actual application reports,
scoped credentials, retries and separate trusted delivery jobs. Postgres SQL and
SQLite handoff tests run locally with embedded Postgres and natively in the
dedicated GitHub workflow.

Protocol references:
- [GitHub repository API](https://docs.github.com/en/rest/repos/repos#get-a-repository)
- [GitHub workflow runs API](https://docs.github.com/en/rest/actions/workflow-runs#list-workflow-runs-for-a-repository)
- [OTLP HTTP JSON response rules](https://opentelemetry.io/docs/specs/otlp/#otlphttp-response)
- [MCP transport specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [Node SQLite](https://nodejs.org/api/sqlite.html)
