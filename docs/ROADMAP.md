# Aurat.ai roadmap

## Phase 0 — validate the pain

- interview AI engineering teams
- document how they currently test model-dependent code
- collect examples of flaky CI, provider outages/rate limits, tool-call regressions, and model drift
- identify 5 design partners

## Phase 1 — deterministic runtime

- OpenAI-compatible proxy
- live / record / replay modes
- deterministic fixtures generated from captured traces
- streaming support
- structured-output support
- tool-call replay
- local CLI: `aurat test`

## Phase 2 — behavioral contracts

- infer stable assertions from traces
- version contracts
- classify strict vs flexible behavior
- regression diff for tool order, schema validity, turn count, latency envelope, and error handling
- GitHub Actions integration

## Phase 3 — existing-stack integrations

- OpenTelemetry ingestion first-class
- Langfuse connector
- LangSmith connector
- Braintrust connector
- provider-agnostic trace normalization

## Phase 4 — live canaries

- select representative high-value scenarios
- periodically run them against real models
- compare behavior with the current contract
- detect prompt/model drift
- configurable deployment gates

## Phase 5 — broader virtualization

- fault injection
- tool/service virtualization
- stateful multi-step agent scenarios
- generalized semantic replay
- synthetic edge-case generation

## Phase 6 — learned simulation

Only after enough real data exists:

- learned response classes
- learned tool-selection behavior
- production-derived latency/error distributions
- realistic simulation beyond exact replay

## North-star outcome

Nothing involving an AI agent reaches production unless Aurat can reproduce its important behavior and verify that the change is safe.
