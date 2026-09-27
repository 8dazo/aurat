# Aurat.ai

**CI for AI agents.**

Aurat.ai turns real AI application behavior into deterministic tests so teams can catch regressions before shipping—without calling the real model on every CI run.

## The problem

AI applications are difficult to test like normal software. Teams usually choose between:

- calling real models in CI, which is nondeterministic, slower, rate-limited, and can become expensive at scale; or
- using hand-written mocks, which are deterministic but rarely behave like production.

As agents become multi-step systems with tool calls, structured outputs, retries, streaming, and state, this gap becomes more painful.

## What Aurat does

Aurat consumes traces from existing observability systems such as LangSmith, Langfuse, Braintrust, or OpenTelemetry, plus an optional Aurat SDK. It turns representative production behavior into versioned behavioral contracts and virtualized CI scenarios.

A typical workflow:

1. Observe real model/agent traces.
2. Build representative behavioral contracts.
3. Run the application against a deterministic virtual model/tool environment in CI.
4. Run a smaller live canary suite against the real provider to detect model or prompt drift.
5. Gate releases when important behavior regresses.

## The wedge

Aurat is not another tracing dashboard and not just an LLM mock server.

Existing observability tools can remain the system of record. Aurat sits underneath them as the deterministic execution and contract-testing layer.

**Keep your tracing stack. Aurat turns production behavior into reliable CI tests.**

## Working MVP

The first slice is intentionally small and dependency-free. It provides an OpenAI-compatible proxy with three modes:

- `live` — proxy requests to the upstream provider;
- `record` — proxy the real request while persisting the exact response to `.aurat/recordings.jsonl`;
- `replay` — return a deterministic previously recorded response without calling the upstream provider.

Request fingerprints are stable across JSON object-key ordering, and replay misses return a deterministic `aurat_replay_miss` error instead of silently falling through to a live model.

### Run it

Requires Node.js 20+.

```bash
npm test

# Record real calls
AURAT_MODE=record node src/cli.js proxy

# Replay the same calls with zero upstream requests
AURAT_MODE=replay node src/cli.js proxy
```

Point an OpenAI-compatible client at:

```text
http://127.0.0.1:4010/v1
```

Useful environment variables:

```text
AURAT_MODE=live|record|replay
AURAT_PORT=4010
AURAT_UPSTREAM_BASE_URL=https://api.openai.com
AURAT_STORE_PATH=.aurat/recordings.jsonl
```

## Next milestones

1. Validate recording/replay against a real OpenAI-compatible application.
2. Preserve streaming timing and add explicit streaming fixtures.
3. Add tool-call and structured-output assertions.
4. Introduce versioned behavioral contracts on top of recorded traffic.
5. Add failure injection for timeouts, rate limits, malformed outputs, and tool errors.
6. Add OpenTelemetry/Langfuse/LangSmith trace ingestion.
7. Add a small live-canary suite for prompt/model drift detection.
8. Add a GitHub PR report and release gate.

## Product principle

Do not try to perfectly simulate model intelligence in V1. First make AI-dependent software reproducible and testable. Progress from record/replay → behavioral contracts → generalized replay → synthetic failures → learned simulation.

## Build workflow

We use Garry Tan's **gstack** workflow for product thinking, engineering planning, review, QA, and shipping. See `AGENTS.md` and `CLAUDE.md`.

## Status

Pre-MVP / validation. The immediate product goal is to integrate with real AI teams, reproduce their current CI pain, and catch at least one real regression that would otherwise have shipped.
