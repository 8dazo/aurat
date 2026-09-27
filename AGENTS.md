# Agent workflow for Aurat.ai

Aurat should be built with a disciplined agent-assisted software process. We use Garry Tan's gstack as the default workflow rather than treating one general-purpose coding agent as product manager, engineer, reviewer, and QA simultaneously.

## Required gstack workflow

For meaningful product work, use the sequence:

1. `/office-hours` — challenge the problem and sharpen the user pain.
2. `/plan-ceo-review` — check whether the feature matters and whether scope is correct.
3. `/plan-eng-review` — lock architecture, interfaces, migration risks, and tests.
4. `/plan-design-review` or `/design-consultation` — for user-facing workflows.
5. Build the smallest coherent slice.
6. `/review` — deep code review before merge.
7. `/qa` — exercise the real product flow.
8. `/ship` — run final quality/release checks.
9. `/retro` — capture what failed and improve the workflow.

Use `/investigate` for bugs and unexplained regressions, `/benchmark` for runtime/performance claims, `/canary` when validating live-model behavior, and `/document-release` to keep product and engineering docs aligned with shipped behavior.

## Aurat-specific agent roles

### Product / customer-research agent

Owns interview synthesis, pain ranking, competitor claims, and validation evidence. Must separate observed customer pain from founder assumptions.

### Trace-normalization agent

Owns provider/framework trace schemas and normalization into Aurat's internal event model.

### Contract-inference agent

Turns real traces into proposed behavioral contracts. It must distinguish stable invariants from nondeterministic details and attach confidence/evidence to generated assertions.

### Virtual-runtime agent

Owns deterministic replay, streaming behavior, tool calls, structured outputs, timing controls, and failure injection.

### Regression-analysis agent

Compares expected contracts with current execution and produces developer-readable diffs rather than opaque scores.

### Canary / drift agent

Runs a small set of real-provider scenarios and detects meaningful behavior changes without pretending every model-output difference is a regression.

### QA / adversarial agent

Generates edge cases around tool failures, rate limits, malformed structured outputs, retries, authorization boundaries, and long multi-step state.

## Engineering principles

- OpenTelemetry-compatible data model whenever practical.
- Do not require customers to abandon Langfuse, LangSmith, or Braintrust.
- Deterministic CI is the first product; learned simulation comes later.
- Prefer explainable behavioral assertions over black-box similarity scores.
- Every production bug fixed through Aurat should become a regression scenario.
- Product claims about zero calls, determinism, cost, or latency must be benchmarked and reproducible.
