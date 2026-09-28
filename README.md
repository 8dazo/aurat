# Aurat

**Catch agent workflow regressions before merging.**

Aurat runs your changed Node application against recorded model responses and tool results. Assert what matters: the correct action, correct arguments, exactly once, in the right order, with a valid final output. Keep your tracing stack.

## Try it

Requires Node 20 or newer. This is a private developer preview, not a published npm release.

```bash
npm ci
npm test
npm run demo
```

The demo executes an agent that receives a recorded model tool call, creates a ticket through a replayed tool, and reports the result. No provider credentials are required. Tests mutate that application to create a duplicate ticket, send incorrect arguments, and report an incorrect result; each mutation must fail against the original fixtures.

## Add your application

Install this repository as a local dependency (`npm install /path/to/aurat`), or install its `npm pack` tarball. Then:

```bash
npx aurat init .aurat
npx aurat test --suite .aurat/suite.json
```

`init` copies the runnable demo without overwriting existing files. Replace its command and fixtures with your application. Paths in a suite are relative to the suite file; commands are argument arrays, without a shell. A scenario gets a fresh process, proxy and fixture cursor.

```js
import { wrapTool, reportOutput } from 'aurat/testing';

const createTicket = wrapTool('create_ticket', args => realTicketClient.create(args));
// Configure your OpenAI-compatible client with OPENAI_BASE_URL.
const ticket = await createTicket({ title: 'Broken login', priority: 'normal' });
reportOutput({ ticketId: ticket.id, status: 'created' });
```

During `aurat test`, wrapped tools return reviewed fixtures instead of invoking their implementations. Unwrapped database, filesystem and native calls are outside that guarantee. Use a disposable application workspace.

See [the working suite](examples/ticket-agent/suite.json) and [scenario guide](docs/scenario-runner.md).

## What fails CI

- Unrecorded or exhausted model requests; missing configured fixtures; unconsumed interactions.
- Tool name, argument, occurrence count or ordering changes.
- Invalid nested output schemas or incorrect expected output.
- Application crashes, timeouts, excessive logs, or a missing Node HTTP guard.
- HTTP requests outside the local replay proxy, even if the application catches the error.
- Empty suites and unknown scenario selections.

Reports distinguish `PASS`, `FAIL`, `INCOMPLETE`, and `INFRA_ERROR`. Only all-PASS returns exit code zero. JSON reports include the Git revision, assertion failures and model/tool coverage.

## GitHub Actions

Install your application's dependencies before invoking the action. Pin the action to a reviewed commit SHA when adopting it:

```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: 22
- run: npm ci
- uses: 8dazo/aurat@<reviewed-commit-sha>
  with:
    suite: .aurat/suite.json
    report: .aurat/report.json
```

The action executes your application. The old `recordings` and `contract` action inputs have been replaced by `suite` and `report`.

## Existing proxy workflow

`aurat proxy --mode record|replay|live`, `inspect`, `contract`, `verify`, `canary`, and `import-otel` remain available. Run `aurat --help` for environment configuration. Replay now consumes each matching response once, in capture order; repeated requests need repeated fixture occurrences.

`verify` compares saved artifacts, not application execution. New v2 contracts check tool arguments and nested JSON types. Existing v1 contracts remain readable with a warning. `canary` probes the original baseline prompts against a live provider; it does not run the changed application and incurs provider usage. OTel conversion reconstructs model interactions from captured message content; it cannot recover absent tool executions, exact stream timing or uncaptured state.

## Boundaries

The initial target is single-process Node agents using OpenAI-compatible HTTP and explicitly wrapped tools. MSW interceptors guard Node fetch and HTTP; this is **not an OS sandbox**. Raw sockets, native database clients, subprocesses that remove the preload, filesystem access and hostile code are not isolated. Provider keys are not inherited by the scenario, but local credential files remain accessible. Run sensitive suites in an isolated CI/container environment with external networking disabled.

SSE data is replayed as an aggregated recorded payload, not with original timing. Tool capture requires sequential calls. Model replay preserves occurrence order per fingerprint, not global cross-request scheduling. Secret redaction covers configured key names and recognizable tokens; it is not a PII detector. Review and sanitize fixtures before committing them. Sanitized fixtures can change application behavior; use synthetic identifiers where necessary.

Dependencies: Ajv for JSON Schema and MSW's interceptors for HTTP interception. See [reuse and implementation notes](docs/implementation-review.md). No paid cloud control plane, learned simulator or broad framework adapter matrix is claimed.
