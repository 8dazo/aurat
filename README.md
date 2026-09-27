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

## Initial MVP

- OpenAI-compatible API support first
- record / replay / verify modes
- streaming, structured outputs, and tool-call support
- behavioral contracts generated from real traces
- deterministic local + CI runtime
- GitHub Actions integration
- failure injection for timeouts, rate limits, malformed outputs, and tool errors
- small live-canary suite for drift detection
- connectors for OpenTelemetry, Langfuse, and LangSmith

## Product principle

Do not try to perfectly simulate model intelligence in V1. First make AI-dependent software reproducible and testable. Progress from record/replay → behavioral contracts → generalized replay → synthetic failures → learned simulation.

## Build workflow

We use Garry Tan's **gstack** workflow for product thinking, engineering planning, review, QA, and shipping. See `AGENTS.md` and `CLAUDE.md`.

## Status

Pre-MVP / validation. The immediate goal is to integrate with real AI teams, reproduce their current CI pain, and catch at least one real regression that would otherwise have shipped.
