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

Aurat currently provides a dependency-free OpenAI-compatible proxy with three modes:

```text
live    app -> Aurat -> provider
record  app -> Aurat -> provider + recording
replay  app -> Aurat -> recording only
```

`replay` is strict: an unknown request returns `aurat_replay_miss` and never silently reaches the real provider. Request fingerprints are stable across JSON object-key ordering and can explicitly ignore configured volatile fields.

### Record and replay

Requires Node.js 20+.

```bash
npm test

OPENAI_API_KEY=sk-... AURAT_MODE=record node src/cli.js proxy
AURAT_MODE=replay node src/cli.js proxy
```

Point an OpenAI-compatible client at `http://127.0.0.1:4010/v1`.

### Turn known-good behavior into a contract

After recording representative scenarios:

```bash
node src/cli.js contract
```

Aurat writes `.aurat/contracts.json`. Each request fingerprint receives a behavioral contract covering status, streaming mode, response kind, tool calls, finish reasons, and structured JSON top-level keys.

Later, record the same scenarios against a changed prompt/model and run:

```bash
node src/cli.js verify
```

Example regression:

```text
Aurat contract: FAIL
Scenarios: 12 checked, 11 passed, 1 failed

POST /v1/chat/completions
  ✗ kind: expected "tool_calls", got "text"
  ✗ toolCalls: expected ["search_docs"], got []
  ✗ finishReasons: expected ["tool_calls"], got ["stop"]
```

`aurat verify` exits non-zero on contracted behavior changes, so it can be used as a CI gate. New request fingerprints are surfaced as uncontracted scenarios without failing V1 verification automatically.

### Ignore volatile request data

Exact replay is the safe default. When your application adds request IDs, timestamps, or similar metadata, create `.aurat/config.json`:

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
```

`OPENAI_API_KEY` is used as the upstream key when `AURAT_UPSTREAM_API_KEY` is not set.

## What V1 proves

1. Capture a real interaction once.
2. Run the application again with the provider disconnected.
3. Preserve streaming/event payloads and tool-call-shaped responses.
4. Tolerate explicitly configured volatile request data.
5. Turn known-good responses into versioned behavioral contracts.
6. Fail CI when the same scenario changes its important behavior.

## Next milestones

1. Preserve original streaming chunk timing and latency envelopes.
2. Add failure injection for timeouts, rate limits, malformed outputs, and tool errors.
3. Add OpenTelemetry/Langfuse/LangSmith trace ingestion.
4. Add a small live-canary runner for prompt/model drift detection.
5. Add a GitHub PR report and release gate.

## Product direction

Aurat will integrate with LangSmith, Langfuse, Braintrust, and OpenTelemetry rather than asking teams to replace their tracing stack.

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
