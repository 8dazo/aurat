# Application replay and workspace report delivery

The GitHub Action executes the caller's Node application through Aurat's replay
runner. An application regression keeps a nonzero exit code. Report delivery is
a separate operation and does not turn a failed gate green.

## Gate and artifact

Use [`examples/github-actions.yml`](../examples/github-actions.yml) as a starting
point. Replace `tests/aurat/suite.json` with the manifest for your agent, install
the agent's own dependencies, and pin the Aurat action and delivery checkout to
the same reviewed commit. Aurat is not published on npm; the action installs its
own dependencies from its checkout.

The action now writes a scenario table to the GitHub job summary and preserves
the report as `aurat-report-<job>-<matrix-index>`, including on failure. The
`status` output records the runner's exit code. Set the optional `artifact-name`
input when invoking multiple suites in the same job. Failed setup can prevent report
creation; a missing report produces an artifact warning, not invented evidence.
In repository branch protection, require the workflow's replay job/check. Aurat
does not modify branch protection or install a GitHub App automatically.

Run PR code without workspace/provider credentials. The example separates report
delivery into another runner job on `push` to the trusted default branch. It does
not use `pull_request_target`, check out a PR in a privileged delivery context, or
deliver fork-PR artifacts using secrets. A caller who needs PR ingestion should
use a trusted artifact ingestion service with explicit repository/run provenance;
that service is not part of this release.

## Create a scoped upload token

Start the private API and connect the local dashboard. Under Connections, select
a project and click **Create CI upload token**. Copy the returned credential
before dismissing it. Tokens are stored only as hashes, are scoped to a project
and `reports:write`, and can be revoked in the same panel. This is a CI credential,
not a user's sign-in session.

Configure the delivery job:

| GitHub setting | Value |
| --- | --- |
| Variable `AURAT_API_URL` | Reachable HTTPS API origin; not the static Vercel frontend |
| Variable `AURAT_PROJECT_ID` | Selected project's ID |
| Secret `AURAT_REPORT_TOKEN` | One-time project CI token |
| Environment `AURAT_REPORT` | Downloaded report filename |
| Environment `AURAT_REPORT_KEY` | Unique logical report/shard key |
| Environment `AURAT_REPORT_JOB` | Optional name of the replay job; defaults to delivery's `GITHUB_JOB` |

For a self-hosted runner on the same machine as the local API, loopback HTTP is
allowed and SQLite persists submitted reports. GitHub's hosted runners cannot
reach your local `127.0.0.1`. Public API routing, account authentication and a
hosted worker are still needed before using the current Vercel domain here.

The uploader sends an HTTPS POST to `/api/ci/reports` using the CI token. It rejects
credentials in URLs, redirects and non-loopback plain HTTP. It retries network
errors, 429 and server errors up to three times with the exact same payload;
authorization/validation failures stop immediately. It never prints the token or
raw server errors. Report and metadata together are limited to 1 MiB.

The receiver verifies token scope, configured repository, report shape and
internal pass/fail consistency. CI reports must include the full tested commit
SHA. Stored identity includes project, repository, run ID, run attempt, replay job
and report key. Retrying the same report returns the original run. Reusing that
identity with different report contents returns 409; use unique keys for matrix
shards. A GitHub re-run has a different attempt and saves separate evidence.

This is **authenticated report submission**, not cryptographic attestation that
GitHub ran the code. Anyone holding the project's upload token can submit that
project's reports. GitHub App/OIDC verification and automated artifact downloads
remain separate work. The metadata includes a link to the claimed GitHub run so
the developer can inspect it.

## API credential management

These routes require the full private workspace bearer token:

- `POST /api/ci-tokens` with `{projectId,name?}` returns the token once.
- `GET /api/ci-tokens` returns metadata with no token or hash.
- `POST /api/ci-tokens/:id/revoke` with `{}` revokes future uploads.

`POST /api/ci/reports` accepts only a scoped CI token, not the workspace token:

```json
{
  "projectId": "<project-id>",
  "label": "Agent replay",
  "ci": {
    "provider": "github-actions",
    "repository": "owner/repository",
    "runId": "12345",
    "runAttempt": "1",
    "job": "aurat",
    "reportKey": "node24"
  },
  "report": {"...": "Aurat v1 offline-application report"}
}
```

The existing workspace import path also accepts the actual runner's process
fields (`signal`, `timedOut`, `outputOverflow`, `spawnError`). Older imports were
tested only with curated reports and incorrectly rejected these fields.

## Verification

`npm test` runs real agent CLI processes, introduces a duplicate tool call, checks
the exit code and uploads the generated reports to the authenticated HTTP API.
Tests cover project/repository scope, revocation, hash-only storage, conflicting
deliveries, bounded retries, summary escaping and persistence. Native Postgres
integration runs separately in GitHub Actions against a disposable Postgres 17
service; local SQL tests use PGlite's embedded Postgres engine.

Reference: [GitHub Actions secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use).
