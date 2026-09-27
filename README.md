# Aurat.ai

**CI for AI agents.**

Aurat.ai turns real AI application behavior into deterministic tests so teams can catch regressions before shipping—without calling the real model on every CI run.

## The problem

AI applications are difficult to test like normal software. Teams usually choose between:

- calling real models in CI, which is nondeterministic, slower, rate-limited, and can become expensive at scale; or
- using hand-written mocks that are deterministic but rarely behave like production.

As agents become multi-step systems with tool calls, structured outputs, retries, streaming, and state, this gap becomes more painful.

## The wedge

Aurat is not another tracing dashboard and not just an LLM mock server. Existing observability tools can remain the system of record; Aurat is the deterministic execution and contract-testing layer that sits underneath them.

**Keep your tracing stack. Aurat turns production behavior into reliable CI tests.**

## Working V1

Aurat has two complementary test loops:

```text
every commit                 nightly / pre-release
────────────                 ─────────────────────
record/import once           small live sample
     ↓                             ↓
replay locally / CI          real provider
     ↓                             ↓
contract verify              same contract
     ↓                             ↓
zero provider calls          model/prompt drift
```

### Record and replay

Requires Node.js 20+.

```bash
npm test

OPENAI_API_KEY=sk-... AURAT_MODE=record node src/cli.js proxy
AURAT_MODE=replay node src/cli.js proxy
```

Point an OpenAI-compatible client at `http://127.0.0.1:4010/v1`. Replay is strict: an unknown request returns `aurat_replay_miss` and never silently reaches the provider.

### Bootstrap from existing OpenTelemetry traces

If the team already captures GenAI telemetry, Aurat can turn replayable OTLP JSON spans into its recording format:

```bash
node src/cli.js import-otel traces.json
node src/cli.js inspect
node src/cli.js contract
```

The importer uses current `gen_ai.input.messages`, `gen_ai.output.messages`, system-instruction, tool-definition, request-model, and related GenAI attributes. It normalizes supported chat spans into OpenAI-compatible requests/responses, including tool calls and streaming SSE.

Message content is opt-in in OpenTelemetry and can contain sensitive information. Aurat skips incomplete spans instead of inventing fixtures, and prints the reason for every skipped class. Review/sanitize imported telemetry before committing recordings. See [`docs/OPENTELEMETRY.md`](docs/OPENTELEMETRY.md).

### Turn known-good behavior into a contract

```bash
node src/cli.js contract
node src/cli.js verify
```

Aurat snapshots status, streaming mode, response kind, tool calls, finish reasons, and structured JSON shape. `verify` exits non-zero when a contracted scenario changes.

### Gate pull requests with GitHub Actions

Commit reviewed recordings and contracts, then add:

```yaml
name: AI regression gate

on: [pull_request]

jobs:
  aurat:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: 8dazo/aurat@main
        with:
          recordings: .aurat/recordings.jsonl
          contract: .aurat/contracts.json
```

The action runs the deterministic verifier, writes the regression diff into the GitHub Actions job summary, and fails the check when a contracted behavior changes. During alpha, `@main` is the supported reference; V1 will be pinned to a release tag before public distribution.

### Run a small live canary

Canaries intentionally make real provider calls. The default is capped at 10 scenarios, selected deterministically by fingerprint:

```bash
OPENAI_API_KEY=sk-... node src/cli.js canary --limit 5
```

Example:

```text
[aurat] live canary: 5/128 contracted scenarios
Aurat live canary: FAIL
Scenarios: 5 checked, 4 passed, 1 failed

POST /v1/chat/completions
  ✗ kind: expected "tool_calls", got "text"
  ✗ toolCalls: expected ["search_docs"], got []
```

This is the complement to replay: run hundreds or thousands of deterministic scenarios without provider calls on every commit, then use a small live suite to detect model/provider drift.

### Inject provider failures without a provider

```bash
node src/cli.js proxy --mode replay --fault rate-limit
node src/cli.js proxy --mode replay --fault server-error
node src/cli.js proxy --mode replay --fault malformed-json
node src/cli.js proxy --mode replay --fault connection-reset
node src/cli.js proxy --mode replay --delay-ms 2000
```

Built-in faults never call the upstream provider and expose `x-aurat-fault` when an HTTP response is returned.

### Ignore volatile request data

Exact replay is the safe default. For request IDs, timestamps, or similar metadata, create `.aurat/config.json`:

```json
{
  "match": {
    "ignoreBodyPaths": ["metadata.request_id", "metadata.timestamp", "messages.*.id"],
    "ignoreQueryParams": ["trace_id"]
  }
}
```

`*` matches one JSON path segment, including array indexes. The same matching rules must be used while recording and replaying.

### Inspect captured traffic

```bash
node src/cli.js inspect
```

This summarizes recorded endpoints, models, and observed OpenAI-style tool calls.

## Configuration

```text
AURAT_MODE=live|record|replay
AURAT_PORT=4010
AURAT_UPSTREAM_BASE_URL=https://api.openai.com
AURAT_UPSTREAM_API_KEY=...
AURAT_STORE_PATH=.aurat/recordings.jsonl
AURAT_CONFIG_PATH=.aurat/config.json
AURAT_CONTRACT_PATH=.aurat/contracts.json
AURAT_CANARY_LIMIT=10
AURAT_FAULT=rate-limit
AURAT_DELAY_MS=0
```

`OPENAI_API_KEY` is used as the upstream key when `AURAT_UPSTREAM_API_KEY` is not set.

## What V1 proves

1. Capture a real interaction once—or import a replayable GenAI trace from an existing OTel stack.
2. Run the application again with the provider disconnected.
3. Preserve streaming/event payloads and tool-call-shaped responses.
4. Tolerate explicitly configured volatile request data.
5. Turn known-good responses into behavioral contracts.
6. Fail CI when contracted behavior changes.
7. Exercise provider failure, parser, retry, and latency paths deterministically.
8. Check a capped live subset against the same contract for model/prompt drift.
9. Drop the verifier into a GitHub pull-request check with no custom CI glue.

## Next milestones

1. Add Langfuse and LangSmith adapters on top of the normalized trace-import layer.
2. Preserve original streaming chunk timing and latency envelopes.
3. Cut and pin the first public V1 release.

## Product direction

Aurat integrates with LangSmith, Langfuse, Braintrust, and OpenTelemetry rather than asking teams to replace their tracing stack.

```text
record/replay
    -> behavioral contracts
    -> generalized replay
    -> synthetic failures
    -> learned simulation
```

## Build workflow

We use Garry Tan's **gstack** workflow for product thinking, engineering planning, review, QA, and shipping. See `AGENTS.md` and `CLAUDE.md`.

## Status

V1 runtime in active development. The immediate product goal is to integrate with real AI teams, reproduce their current CI pain, and catch at least one real regression that would otherwise have shipped.
