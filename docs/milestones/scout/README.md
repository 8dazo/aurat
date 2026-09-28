# Real application regression: Scout narration

Aurat now has a regression suite in a second application repository, beyond the bundled ticket-agent demonstration.

- Application: [8dazo/scout](https://github.com/8dazo/scout)
- Fix and executable reproduction: [Scout PR #2](https://github.com/8dazo/scout/pull/2)
- Original source: `d1aefb6face6d1ca7b78d3c55ef75ba40e05c62c`
- Fixed source and CI: `f6cf3521a5ce1222891af3554057e73af17abf5c`
- [Successful GitHub Actions run](https://github.com/8dazo/scout/actions/runs/36434584636)

## Defect

`packages/llm/src/narrate.ts` checked that `summary` and `recommendedAction` were truthy and that `why` had an acceptable array length. It accepted a numeric summary, an object action, and non-string reasons. These are source-discovered defects reproduced with synthetic model responses, not claimed production incidents.

## Proof

The entrypoint imports an esbuild bundle of Scout's **actual narration module**. A captured OpenAI-compatible request is replayed with four reviewed responses. The entrypoint reports whether Scout rejected each response; Aurat checks that output.

| Scenario | Original | Fixed |
| --- | --- | --- |
| valid-narration | PASS | PASS |
| reject-numeric-summary | FAIL | PASS |
| reject-object-action | FAIL | PASS |
| reject-nonstring-reasons | FAIL | PASS |

The fixtures and assertions are unchanged between runs. The fix validates nonempty strings in the real application function. CI installs Aurat from the reviewed commit, builds Scout's module, runs the suite, and uploads the report even on failure.

`before.json` and `after.json` are the original local runner outputs. The fixed output was captured before committing the fix, so its revision field still identifies the checkout base; the working-tree code corresponds to the fixed source above. The platform example separately annotates that source revision and omits process logs. These files are not relabelled as downloaded CI artifacts.

## Reproduce

```sh
git clone https://github.com/8dazo/scout.git
cd scout
git checkout f6cf3521a5ce1222891af3554057e73af17abf5c
npm ci --prefix .aurat
npm test --prefix .aurat
```

To observe the original failure, restore only `packages/llm/src/narrate.ts` from the original source revision in a disposable checkout and rerun the same suite. Expect three failures and nonzero exit status.

## What this proves

A real application's changed source is executed against unchanged external-interaction fixtures, and invalid model-output acceptance is detected in CI. This checks Scout's narration boundary. It does not validate its full live research workflow, external data correctness, concurrent tools, or OS-level isolation.
