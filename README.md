# Aurat.ai

**CI for AI agents.**

Aurat.ai turns real AI application behavior into deterministic tests so teams can catch regressions before shipping—without calling the real model on every CI run.

## The problem

AI applications are difficult to test like normal software. Teams usually choose between:

- calling real models in CI, which is nondeterministic, slower, rate-limited, and can become expensive at scale; or
- using hand-written mocks, which are deterministic but rarely behave like production.

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

`replay` is strict: an unknown request returns `aurat_replay_miss` and never silently reaches the real provider.

Request fingerprints are stable across JSON object-key ordering. Recordings preserve raw provider response bytes, including SSE/event-stream payloads, and older V1 text recordings remain replayable.

### Run it

Requires Node.js 20+.

```bash
npm test

# Record real calls
OPENAI_API_KEY=sk-... AURAT_MODE=record node src/cli.js proxy

# Replay the same calls with zero upstream requests
AURAT_MODE=replay node src/cli.js proxy
```

Point an OpenAI-compatible client at:

```text
http://127.0.0.1:4010/v1
```

Aurat adds debugging headers such as `x-aurat-mode`, `x-aurat-replay`, and `x-aurat-fingerprint`.

### Inspect captured traffic

```bash
node src/cli.js inspect
```

This summarizes recorded endpoints, models, and observed OpenAI-style tool calls without needing an observability dashboard.

Useful environment variables:

```text
AURAT_MODE=live|record|replay
AURAT_PORT=4010
AURAT_UPSTREAM_BASE_URL=https://api.openai.com
AURAT_UPSTREAM_API_KEY=...
AURAT_STORE_PATH=.aurat/recordings.jsonl
```

`OPENAI_API_KEY` is used as the upstream key when `AURAT_UPSTREAM_API_KEY` is not set. A dedicated upstream key lets an application use a local/dummy client credential while Aurat authenticates to the real provider.

## What V1 proves

The first milestone is not perfect model simulation. It is reproducible execution around a model dependency:

1. capture a real interaction once;
2. run the application again with the provider disconnected;
3. preserve streaming/event payloads and tool-call-shaped responses;
4. fail loudly when CI asks for behavior that was never recorded.

## Next milestones

1. Add request matchers that can deliberately ignore volatile fields.
2. Preserve original streaming chunk timing and latency envelopes.
3. Add tool-call and structured-output behavioral assertions.
4. Introduce versioned behavioral contracts on top of recorded traffic.
5. Add failure injection for timeouts, rate limits, malformed outputs, and tool errors.
6. Add OpenTelemetry/Langfuse/LangSmith trace ingestion.
7. Add a small live-canary suite for prompt/model drift detection.
8. Add a GitHub PR report and release gate.

## Product direction

Aurat will integrate with LangSmith, Langfuse, Braintrust, and OpenTelemetry rather than asking teams to replace their tracing stack.

The progression is intentionally:

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
