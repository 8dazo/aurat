# Verification and current limits

## Verified

- Scout's actual bundled narration function: unchanged fixtures yield 1 PASS / 3 FAIL on original source and 4 PASS after type validation.
- Scout PR #2 CI: Aurat narration regressions completed successfully, workflow run 36434584636, commit f6cf3521a5ce1222891af3554057e73af17abf5c.
- Seven route integration tests cover anonymous denial, origin/content type/JSON/size rejection, project URL validation, contradictory and duplicate reports, real before/after import, redaction, passing baseline persistence, and cross-owner isolation.
- The route tests run the actual API, query, and validation modules against SQLite. Only platform identity and D1 transport are substituted; they do not verify the hosted identity proxy or browser interaction.
- TypeScript validation passed.

## Product limits

- Only the latest 100 imported reports are loaded in the initial workspace. Exports contain the currently loaded workspace, not an unlimited archival export.
- Report imports are user-supplied evidence, not signed CI attestations. A passing import does not independently prove execution.
- Secret redaction is best-effort. Sanitize business data before importing.
- Baseline comparison currently compares scenario status, not arbitrary structural event diffs.
- The public research source HTML/CSS is excluded from the shipped app.
- The managed browser control skill was unavailable. Desktop/mobile visual and click-through QA could not be performed. The managed preview address was also unreachable from the shell. Source-level responsiveness and the production build are checked; browser QA remains a release follow-up.

The example JSON preserves actual scenario evidence but omits process output and identifies the source revision corresponding to each tested code state. The fixed run was captured before the equivalent remote commit was created; it is a local reproduction, not the downloaded CI artifact.

Production build completed successfully. All 50 core Aurat tests also pass.

## Built Worker smoke check

The actual production Worker was loaded into a local Miniflare/D1 runtime with isolated test identity headers. Landing, docs, and every dashboard view returned 200; an unknown route returned 404 and anonymous workspace API access returned 401. Project creation, real report import, passing baseline selection, and a fresh workspace read all passed. This verifies server rendering and storage flow, not browser hydration or visual appearance.

Private deployment succeeded at https://aurat-workspace.d3c1.chatgpt.site .
