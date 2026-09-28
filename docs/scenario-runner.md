# Scenario runner

## Manifest

A suite has `version: 1` and a nonempty `scenarios` array. Each scenario needs a unique `id`, `command` argv array and nonempty `expect` object. Optional fields:

| Field | Meaning |
| --- | --- |
| cwd | Application directory relative to the manifest; default manifest directory |
| recordings | Model JSONL fixture file; if specified it must exist |
| tools | Ordered inline fixture array or path to a JSON array |
| config | Existing matching configuration; if specified it must exist |
| timeoutMs | 100–600000ms; default 30000 |

A tool fixture has `name`, `args`, and exactly one of `result` or `error`. Errors throw in the application so recovery branches can be tested. Fixtures must cover every call. Each scenario has a fresh queue; concurrent requests sharing a fingerprint receive occurrences in arrival order. Use separate scenarios for branches with different inputs.

Assertions support:

- `outputEquals`: deep JSON equality, ignoring object key order.
- `outputSchema`: Ajv JSON Schema, including nested types, required fields and bounds.
- `tools`: rules with `name`, `count`, `min`, `max`, `arguments`, `argumentsSchema`. Without count bounds a rule requires at least one call. `max: 0` forbids a tool.
- `toolOrder`: exact full sequence of wrapped tool names.
- `before`: pairs such as `[["authorize", "charge"]]`; both must occur and all calls of the first must precede any of the second.

Schema validation does not coerce values. Assertions observe sanitized events. Report exactly one output when asserting a final output. Multiple tool-owning processes are unsupported and duplicate occurrence indices fail the suite.

```bash
npx aurat test --suite .aurat/suite.json --scenario refund-denied --report .aurat/report.json
```

## Capture and review a real scenario

1. Point your OpenAI-compatible client at `http://127.0.0.1:4010/v1`. Start `aurat proxy --mode record` with `AURAT_STORE_PATH` set to a scenario-specific file and provider credentials set in the proxy process.
2. Wrap every external tool boundary with `wrapTool`. Execute your known-good application with `AURAT_MODE=record` and `AURAT_TOOL_RECORDINGS_PATH` pointing to a separate scenario-specific JSONL file. Recording mode invokes real tools; use a controlled test account. Await each tool; overlapping capture calls are rejected.
3. Convert the tool JSONL into an array (below). Inspect and sanitize both files. Keep fixtures for exactly one application run, including retries.
4. Add the command and fixture paths to the manifest. Write assertions from intended business behavior; do not blindly accept observed output as correct. Commit reviewed fixtures and the manifest.
5. Run the suite, then deliberately break an argument or action count to verify that the relevant regression is detected. Restore the application afterward.

```js
// Convert one sequential tool capture, run as an ES module.
import { readFile, writeFile } from 'node:fs/promises';
const entries = (await readFile('tools.jsonl', 'utf8')).split('\n').filter(Boolean).map(JSON.parse);
await writeFile('tools.json', JSON.stringify(entries, null, 2));
```

A changed prompt creates a replay miss. Review it and capture a new controlled baseline; never auto-update fixtures merely to make CI green. Do not discard old bug scenarios that still represent required behavior.

## Isolation and report handling

The runner passes a small environment allowlist and placeholder OpenAI key. It does not inherit arbitrary application configuration. Use synthetic fixture configuration in the test entrypoint. Node children inherit the preload but tool ownership must remain in one process. Linux/macOS process groups are terminated on timeout or entrypoint exit. Windows descendant cleanup has not been verified.

The guard is accidental HTTP egress protection. For network isolation, install dependencies first, then execute both Aurat and the application inside the same container with external networking disabled (for Docker: `--network none`); loopback proxy traffic stays inside that container. This deployment recipe has not been tested here. The application can still read/write mounted files: mount only a disposable project and fixtures, not credentials.

Reports contain sanitized outputs and argument values, which may still include business data or PII. Restrict artifact access. Stable hashed aliases retain correlations and are not anonymization. Existing historical fixtures are not rewritten automatically.

## Migration from 0.1

- `npm ci` is now required: Aurat uses Ajv and MSW interceptors.
- Replay consumes occurrences instead of returning the last response indefinitely.
- Generate v2 contracts to enable detailed tool-argument and nested schema checks. V1 compatibility remains explicit and weaker.
- Empty contracts and unexpected recorded fingerprints now fail verification.
- Switch Actions inputs to `suite`/`report` and provide an actual application entrypoint.
- Package remains private. Install locally or from a reviewed tarball; public publishing is not part of this change.
