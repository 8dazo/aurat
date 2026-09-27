# Aurat.ai development instructions

## Product

Aurat.ai is the CI and service-virtualization layer for AI applications. It consumes real AI traces, builds versioned behavioral contracts, runs deterministic virtualized tests without hitting live model providers for every case, and uses a smaller live-canary suite to detect model/prompt drift.

Read `README.md`, `docs/PRODUCT.md`, `docs/ROADMAP.md`, and `AGENTS.md` before making major product or architecture changes.

## gstack

Use Garry Tan's gstack workflow for planning, implementation, review, QA, and shipping.

Install for Claude Code:

```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup
```

For substantial work, begin with `/office-hours` or `/plan-ceo-review`, then use `/plan-eng-review`. Before shipping, use `/review`, `/qa`, and `/ship`. Use `/investigate` for debugging, `/canary` for live-model validation, `/benchmark` for quantitative claims, and `/document-release` when behavior changes require documentation updates.

## Guardrails

- Do not build a generic observability dashboard first.
- Do not make static hand-authored mocks the primary product.
- Do not claim perfect LLM simulation.
- Keep the V1 provider surface narrow: OpenAI-compatible first.
- Prefer compatibility with existing tracing stacks over replacing them.
- Every important behavior should have a deterministic regression test.
