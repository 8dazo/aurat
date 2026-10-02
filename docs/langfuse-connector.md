# Langfuse → Aurat captured evidence

The private control plane can verify a Langfuse Cloud project and import its
captured chat generations. Imported evidence feeds the existing contract,
stored-trace verification and trigger flows. It works with SQLite now and the
Postgres adapter when configured. No Langfuse account is provisioned.

## Configure and connect

Add a project API key with trace read access to the ignored root `.env`:

```dotenv
AURAT_LANGFUSE_BASE_URL=https://cloud.langfuse.com
AURAT_LANGFUSE_PUBLIC_KEY=<your-project-public-key>
AURAT_LANGFUSE_SECRET_KEY=<your-project-secret-key>
```

Supported regional origins are `https://cloud.langfuse.com` (EU),
`https://us.cloud.langfuse.com` (US), `https://jp.cloud.langfuse.com` (Japan), and
`https://hipaa.cloud.langfuse.com`. Choose the region of your project. Self-hosted
origins are not supported by this release. Arbitrary URLs, non-HTTPS origins,
embedded credentials, paths and redirects are rejected.

Restart the private API, connect the local dashboard, select an Aurat project,
and choose **Verify Langfuse connection** on Connections. The API verifies the
credentials against `GET /api/public/projects`; it saves only the regional origin
and remote project identity, never the keys or Authorization header. One server
key pair is configured at a time; this is not a multi-tenant credential vault.
Each Aurat project can have one Langfuse connector.

Keys stay on the server, not in browser storage, client bundles, connection
records, MCP results or job payloads. Never paste keys into API request bodies or
commit `.env`. Rotate keys within the same Langfuse project by updating `.env`
and restarting. An existing connector rejects a change to its region or remote
project, including a key that belongs to a different project.

## Import a window

Choose a past time range of at most seven days. Dashboard dates are **UTC**:
the lower bound is inclusive and the upper bound exclusive. Import the first
page, then select **Import next page** until the window is exhausted. Every
request imports at most 50 observations; there is no unbounded background scan.

The connector uses `GET /api/public/v2/observations`, selects generation rows,
requests `core,basic,io,model`, and forwards the opaque `meta.cursor` with the same
time bounds for the next page. It does not call the deprecated trace endpoints.
Some source SDK/exporter configurations have ingestion delay; repeat a window
later if recent generations have not appeared.

Each page reports scanned, imported, duplicate and skipped counts. A page with
no usable evidence does not invent a recording or passing result. Every row is
checked against the connected remote project and requested time window before
any rows in that page are saved. Credentials are reverified on every page.

Retrying the same page is safe. Identity includes the Aurat project, regional
origin, Langfuse project, trace and observation IDs. Atomic insertion prevents
duplicate evidence under concurrent imports on both SQLite and Postgres. A row
with the same identity but changed captured evidence is reported as
`changed_observation`; the earlier evidence is not silently overwritten. An
incomplete generation is skipped rather than reserving its ID, so it can be
imported after completion.

Pagination is newest-first. Saved evidence is ordered by the provider's start
time, not the time it was imported; a later-imported older page cannot replace
newer behavior for the same request fingerprint. Same-millisecond ties use the
stable record ID, not a claim about sub-millisecond ordering.

On reload, the dashboard shows the last saved page summary but does not retain
the cursor. Re-enter the same window and start from the first page; duplicates
are skipped. Cursors and totals are per page, not a durable export session.
If a database write fails partway through a page, retry it; already saved rows
remain valid and the next cursor is not returned until the page finishes.

## Supported captured content

- Completed `GENERATION` observations with source identity, timestamps and model.
- OpenAI-compatible chat message arrays or a request object containing `messages`.
- Langfuse v2 JSON-string I/O, plus already-parsed I/O.
- Text messages, tool responses, assistant function calls, refusals, and full chat
  completion `choices`. Captured request options and tool definitions are retained.
- Plain captured output text, represented as an assistant message without an
  invented finish reason, token count or usage estimate.

Streaming, images/audio, non-chat/Responses API shapes, missing/errored outputs,
unknown request parameters and malformed tool arguments are skipped with reasons.
The synthetic fixture at [`examples/langfuse/observations.json`](../examples/langfuse/observations.json)
shows the API shape exercised by tests; it is not a user's production trace.

Secret-pattern redaction happens before request fingerprinting and response
encoding, including JSON inside function arguments. This is **not comprehensive
personal-data removal**. Captured messages are stored in your selected workspace
database; review your retention and data-sharing requirements before importing.

The imported recording contains only captured content. It cannot reconstruct
unrecorded request options, hidden tool definitions, tool execution results or
stream timing. Stored-trace verification is not application replay, an exhaustive
trace export, or proof that a PR's changed code ran. Use the actual replay runner
and [CI integration](ci-report-delivery.md) for application checks.

## API

All routes require the private workspace bearer token; CI upload tokens cannot
configure a connector or read/import traces.

```http
POST /api/connections
Content-Type: application/json
Authorization: Bearer <workspace-token>

{"projectId":"<aurat-project-id>","type":"langfuse"}
```

```http
POST /api/connections/<connection-id>/sync
Content-Type: application/json
Authorization: Bearer <workspace-token>

{
  "fromStartTime":"2025-01-01T00:00:00Z",
  "toStartTime":"2025-01-02T00:00:00Z"
}
```

For the next page, send the returned `nextCursor` as `cursor` with identical
bounds. The JSON result includes `scanned`, `imported`, `duplicates`, `skipped`,
`nextCursor` and `complete`. Rate limits return HTTP 429 without advancing;
authentication, response-shape and upstream errors are sanitized. Requests have
a shared 20-second upstream deadline, a 4 MiB response limit, and a 256 KiB
per-observation normalization limit. Narrow the window if a page is too large.

Use **Create behavioral contract** after importing, then verify stored traces.
The existing MCP `list_connections`, `create_contract` and `verify_contract`
tools see the same saved data; no second database or key copy is involved.

## Verification and remaining work

Tests use a synthetic v2 upstream and the real authenticated HTTP handler,
normalizer and stores. They cover pagination, request scope, credential secrecy,
redaction, unsupported content, concurrency, timestamp ordering, changed-tool
failures, rate limits, network failures and oversized/interrupted responses.
Postgres integration repeats the import/deduplication/contract flow against the
database adapter. A live authenticated Langfuse smoke test requires your keys
and has not been performed by these fixtures.

The public Vercel frontend remains an example workspace until the hosted API,
account authorization and worker are connected. This release does not bypass
those boundaries or enable cloud-to-local access. LangSmith, Braintrust and an
outbound MCP client remain separate connectors to build.

References:
- [Langfuse Public API and Observations API v2](https://langfuse.com/docs/api-and-data-platform/features/public-api)
- [Langfuse deprecated API migration](https://langfuse.com/faq/all/deprecated-api-migration)
