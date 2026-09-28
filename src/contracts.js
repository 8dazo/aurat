import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { analyzeRecording } from "./behavior.js";
import { isDeepStrictEqual } from "node:util";
import { schemaErrors } from "./schema.js";

function latestByFingerprint(recordings) {
  const latest = new Map();
  for (const recording of recordings) latest.set(recording.fingerprint, recording);
  return latest;
}

export function buildContract(recordings) {
  const latest = latestByFingerprint(recordings);
  const scenarios = [...latest.values()]
    .map((recording) => ({
      fingerprint: recording.fingerprint,
      request: {
        method: recording.request.method,
        path: recording.request.path,
        model: typeof recording.request.body?.model === "string" ? recording.request.body.model : null,
        streaming: recording.request.body?.stream === true,
      },
      expected: (() => { const { jsonValue, ...expected } = analyzeRecording(recording, { detailed: true }); return expected; })(),
    }))
    .sort((left, right) => left.fingerprint.localeCompare(right.fingerprint));

  return {
    version: 2,
    createdAt: new Date().toISOString(),
    scenarios,
  };
}

function same(left, right) {
  return isDeepStrictEqual(left, right);
}

function compareBehavior(expected, actual, version) {
  const failures = [];
  for (const field of ["status", "contentType", "streaming", "kind", "toolCalls", "finishReasons", "jsonKeys"]) {
    if (!same(expected[field], actual[field])) {
      failures.push({ field, expected: expected[field], actual: actual[field] });
    }
  }
  if (version === 2) {
    for (const field of ["toolDetails", "malformed"]) {
      if (!same(expected[field], actual[field])) failures.push({ field, expected: expected[field], actual: actual[field] });
    }
    if (expected.jsonSchema) {
      const errors = schemaErrors(expected.jsonSchema, actual.jsonValue);
      if (errors.length) failures.push({ field: "jsonSchema", expected: expected.jsonSchema, actual: errors });
    }
  }
  return failures;
}

export function verifyContract(contract, recordings, { allowUnexpected = false } = {}) {
  if (!contract || ![1, 2].includes(contract.version) || !Array.isArray(contract.scenarios)) {
    throw new Error("Unsupported or invalid Aurat contract");
  }

  const latest = latestByFingerprint(recordings);
  const expectedFingerprints = new Set(contract.scenarios.map((scenario) => scenario.fingerprint));
  const scenarios = [];

  for (const scenario of contract.scenarios) {
    const recording = latest.get(scenario.fingerprint);
    if (!recording) {
      scenarios.push({
        fingerprint: scenario.fingerprint,
        request: scenario.request,
        ok: false,
        failures: [{ field: "recording", expected: "present", actual: "missing" }],
      });
      continue;
    }

    const actual = analyzeRecording(recording, { detailed: contract.version === 2 });
    const failures = compareBehavior(scenario.expected, actual, contract.version);
    scenarios.push({
      fingerprint: scenario.fingerprint,
      request: scenario.request,
      ok: failures.length === 0,
      failures,
    });
  }

  const unexpected = [...latest.keys()].filter((fingerprint) => !expectedFingerprints.has(fingerprint)).sort();
  return {
    ok: scenarios.length > 0 && scenarios.every((scenario) => scenario.ok) && (allowUnexpected || unexpected.length === 0),
    empty: scenarios.length === 0,
    legacy: contract.version === 1,
    checked: scenarios.length,
    passed: scenarios.filter((scenario) => scenario.ok).length,
    failed: scenarios.filter((scenario) => !scenario.ok).length,
    unexpected,
    scenarios,
  };
}

export async function writeContract(path, contract) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(contract, null, 2)}\n`, "utf8");
}

export async function readContract(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export function formatVerification(result) {
  const lines = [
    `Aurat contract: ${result.ok ? "PASS" : "FAIL"}`,
    `Scenarios: ${result.checked} checked, ${result.passed} passed, ${result.failed} failed`,
  ];
  if (result.empty) lines.push("INCOMPLETE: no contracted scenarios; refusing an empty pass.");
  if (result.legacy) lines.push("Legacy v1 contract: regenerate for nested schemas and tool argument checks.");

  for (const scenario of result.scenarios.filter((item) => !item.ok)) {
    lines.push("", `${scenario.request.method} ${scenario.request.path}`);
    for (const failure of scenario.failures) {
      lines.push(`  ✗ ${failure.field}: expected ${JSON.stringify(failure.expected)}, got ${JSON.stringify(failure.actual)}`);
    }
  }

  if (result.unexpected.length > 0) {
    lines.push("", `New/uncontracted scenarios: ${result.unexpected.length}`);
    for (const fingerprint of result.unexpected.slice(0, 10)) lines.push(`  ! ${fingerprint}`);
    if (result.unexpected.length > 10) lines.push(`  ... ${result.unexpected.length - 10} more`);
  }

  return `${lines.join("\n")}\n`;
}
