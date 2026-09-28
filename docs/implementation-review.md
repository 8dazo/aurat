# Application regression slice: implementation and review

## Product decision

For a pre-customer startup, the first deliverable is a falsifiable demo: the changed application passes a known-good workflow and fails when it duplicates a write, changes arguments or produces an incorrect result. Avoid a cloud dashboard until design partners demonstrate recurring CI use. The positioning is “catch agent workflow regressions before merging”; initial users are Node teams with costly tool-side mistakes.

The next founder task is to run this on three prospective users' real workflows, measure time to first useful failure, and record which production bug the test would have caught. No customer adoption, savings or YC readiness is asserted by this implementation.

## Reuse decisions

| Project | Reused | Integration |
| --- | --- | --- |
| [Ajv](https://github.com/ajv-validator/ajv) | JSON Schema validation | Pinned npm dependency, MIT |
| [MSW interceptors](https://github.com/mswjs/interceptors) | Node HTTP/fetch interception | Pinned npm dependency, MIT |
| [VCR.py](https://github.com/kevin1024/vcrpy) | Consumable cassette occurrence concept | Independent implementation; no source copied |
| [Chronicle](https://github.com/theagentplane/chronicle) | Explicit replay boundaries as design reference | Independent wrapper; no source copied |

Dependency licenses ship with installed packages. The repository remains private; no public license grant or npm publication was added.

## gstack workflow evidence

Reviewed the gstack source and applied its problem/scope, engineering, review and real-flow QA checklists. The full gstack slash-command runtime was not installed or executed; this is a source-guided review, not a claim of an automated gstack certification.

- Product/CEO: prioritize application execution and explicit outcomes; defer SaaS and speculative adapters.
- Engineering: additive runner around the existing proxy, schema-checked manifests, process-local tool ownership, consumable fixtures and explicit coverage.
- Design: runnable init example, one command, failure-specific messages, machine-readable report.
- Review: fixed concurrent fixture reservation, unexpected/empty passes, secret persistence, missing configuration handling, duplicated tool occurrence indices and concurrent capture ambiguity. Commands use argv arrays; action inputs cross through environment variables.
- QA: real subprocess demo; mutations for duplicate actions, wrong arguments and incorrect output; coverage omissions, crashes/timeouts, missing fixtures, credential inheritance, and blocked fetch/HTTP with zero test-server hits.
- Release: private 0.2.0 package, lockfile, Node 22/24 CI matrix, documentation of action/replay migration. No public publish or deployment.
- Retro: artifact comparison alone cannot prove application behavior. Keep a changed-code failure demo in CI and keep live-provider drift separate from offline application regression.

## Known limits

Node-only cooperative instrumentation; not a security sandbox. Single tool-owning process. Sequential tool capture. SSE timing is not reconstructed. OTel import does not capture missing tool/state boundaries. Redaction is a secrets baseline, not full PII protection. Linux Node 24 is the locally exercised environment. Initial CI passed Node 22/24 but exposed the interceptor dependency’s Node 22 minimum; the engine floor and runtime guard now explicitly reject Node 20. No latency/cost benchmark claims.
