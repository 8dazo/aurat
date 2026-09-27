# Product thesis

## One-line pitch

**Aurat.ai is CI for AI agents: it turns production AI behavior into deterministic tests and catches regressions before teams ship.**

## Layman version

Normal software is easy to test because the same input usually gives the same output. AI models do not behave that way. Aurat watches how an AI feature behaves when it works, then creates reliable test scenarios that can be replayed during development and CI without hitting the real model every time.

## Why now

AI applications are moving from single prompts to multi-step agents with tools, state, retries, structured output, and streaming. Traditional mocks are too shallow, while live-provider tests are nondeterministic and operationally noisy. Teams need a repeatable testing layer between application code and model providers.

## What Aurat owns

- deterministic execution for AI-dependent application tests
- production-derived behavioral contracts
- model/service virtualization
- tool and failure-path virtualization
- CI regression reports
- live canary checks for prompt/model drift
- release gates for AI behavior

## What Aurat should not rebuild first

- general observability dashboards
- generic prompt playgrounds
- another full tracing SDK if OpenTelemetry or existing tracing providers can supply the data
- generic agent world simulation
- static fixture authoring as the primary experience

## Inputs

- OpenTelemetry
- Langfuse
- LangSmith
- Braintrust
- Aurat SDK

## Outputs

- versioned behavioral contracts
- deterministic virtual test scenarios
- CI pass/fail signal
- regression diff
- failure-path coverage
- live model drift report

## Core demo

A developer changes an agent prompt or orchestration path and opens a pull request. Aurat runs hundreds of representative historical scenarios without making hundreds of live model calls, then reports a small set of behavioral regressions. A smaller canary set runs against the actual provider to detect real-model drift.

The demo succeeds when Aurat can say: **this pull request would have broken your agent, and we caught it before production.**

## Initial customer

AI product teams with production agents, CI pipelines, tool calls, and enough engineering velocity that regressions and nondeterministic testing are recurring problems.

Examples include support agents, coding agents, workflow automation, fintech AI workflows, enterprise RAG, voice agents, and vertical AI products.

## Validation milestone

- 15 customer interviews
- 5 design partners
- 3 teams repeatedly running Aurat in CI
- at least 1 team willing to pay
- at least 1 real regression caught before release
