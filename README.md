# Aurat.ai

**CI for AI agents.**

Aurat.ai turns real AI application behavior into deterministic tests so teams can catch regressions before shipping—without calling the real model on every CI run.

## Why

AI applications are difficult to test like normal software. Teams usually choose between calling real models in CI—which is nondeterministic, slower, rate-limited, and can become expensive at scale—or using hand-written mocks that rarely behave like production.

Aurat's first job is narrower: make the model dependency reproducible.

## V1: record once, replay deterministically

Aurat is an OpenAI-compatible proxy with three modes:

```text
live    app -> Aurat -> provider
record  app -> Aurat -> provider + cassette
replay  app -> Aurat -> cassette only
```

### Quick start

```bash
npm install

# Record real responses
OPENAI_API_KEY=sk-... npm run dev -- --mode record
```

Point your existing OpenAI-compatible client at:

```text
http://127.0.0.1:8787/v1
```

For example:

```ts
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "http://127.0.0.1:8787/v1",
});
```

Captured interactions are stored under `.aurat/cassettes/`.

Then replay with no provider calls:

```bash
npm run dev -- --mode replay
```

The same request receives the recorded provider response. An unknown request fails explicitly with `aurat_replay_miss` instead of silently calling the provider.

Health check:

```bash
curl http://127.0.0.1:8787/_aurat/health
```

## Configuration

```text
AURAT_MODE=live|record|replay
AURAT_PORT=8787
AURAT_UPSTREAM_URL=https://api.openai.com
AURAT_CASSETTE_DIR=.aurat
AURAT_UPSTREAM_API_KEY=...
```

`OPENAI_API_KEY` is also accepted as the upstream key.

## Product direction

V1 is intentionally not a claim that Aurat can perfectly simulate model intelligence. The progression is:

```text
record/replay
    -> behavioral contracts
    -> generalized replay
    -> synthetic failures
    -> learned simulation
```

Aurat will integrate with LangSmith, Langfuse, Braintrust, and OpenTelemetry rather than asking teams to replace their tracing stack.

See [`docs/V1.md`](docs/V1.md), [`docs/PRODUCT.md`](docs/PRODUCT.md), and [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Build workflow

We use Garry Tan's **gstack** workflow for product thinking, engineering planning, review, QA, and shipping. See `AGENTS.md` and `CLAUDE.md`.
