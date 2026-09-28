import { formatVerification, verifyContract } from "./contracts.js";
import { buildUpstreamUrl } from "./upstream.js";

function latestByFingerprint(recordings) {
  const latest = new Map();
  for (const recording of recordings) latest.set(recording.fingerprint, recording);
  return latest;
}

function requestBody(recording) {
  const body = recording.request.body;
  if (body === null || body === undefined) return undefined;
  if (typeof body === "string") return body;
  return JSON.stringify(body);
}

function requestHeaders(recording, apiKey) {
  const headers = new Headers();
  const body = recording.request.body;
  if (body !== null && body !== undefined && typeof body !== "string") {
    headers.set("content-type", "application/json");
  }
  if (apiKey) headers.set("authorization", `Bearer ${apiKey}`);
  return headers;
}

function snapshotHeaders(headers) {
  return Object.fromEntries(headers.entries());
}

function recomputeVerification(verification) {
  verification.passed = verification.scenarios.filter((scenario) => scenario.ok).length;
  verification.failed = verification.scenarios.filter((scenario) => !scenario.ok).length;
  verification.checked = verification.scenarios.length;
  verification.ok = verification.failed === 0;
  return verification;
}

export async function runCanary({
  contract,
  recordings,
  upstreamBaseUrl = "https://api.openai.com",
  upstreamApiKey,
  limit = 10,
  fetchImpl = fetch,
}) {
  if (!contract || ![1, 2].includes(contract.version) || !Array.isArray(contract.scenarios)) {
    throw new Error("Unsupported or invalid Aurat contract");
  }
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error("Aurat canary limit must be a positive integer");
  }
  if (contract.scenarios.length === 0) {
    throw new Error("Aurat contract contains no scenarios");
  }

  const baselineByFingerprint = latestByFingerprint(recordings);
  const selectedScenarios = [...contract.scenarios]
    .sort((left, right) => left.fingerprint.localeCompare(right.fingerprint))
    .slice(0, Math.min(limit, contract.scenarios.length));

  // Preflight before spending provider calls: every selected contract needs the
  // original request body/path from its baseline recording.
  const missingBaselines = selectedScenarios.filter((scenario) => !baselineByFingerprint.has(scenario.fingerprint));
  if (missingBaselines.length > 0) {
    throw new Error(`Missing baseline recordings for ${missingBaselines.length} selected canary scenario(s)`);
  }

  const candidateRecordings = [];
  const liveErrors = new Map();

  for (const scenario of selectedScenarios) {
    const baseline = baselineByFingerprint.get(scenario.fingerprint);
    const method = baseline.request.method ?? "POST";
    const target = buildUpstreamUrl(upstreamBaseUrl, baseline.request.path);

    try {
      const response = await fetchImpl(target, {
        method,
        headers: requestHeaders(baseline, upstreamApiKey),
        body: ["GET", "HEAD"].includes(method.toUpperCase()) ? undefined : requestBody(baseline),
        redirect: "manual",
        signal: AbortSignal.timeout(30000),
      });
      const bytes = Buffer.from(await response.arrayBuffer());
      candidateRecordings.push({
        version: 2,
        fingerprint: scenario.fingerprint,
        createdAt: new Date().toISOString(),
        request: baseline.request,
        response: {
          status: response.status,
          headers: snapshotHeaders(response.headers),
          body: bytes.toString("base64"),
          bodyEncoding: "base64",
        },
        metadata: { canary: true, upstreamUrl: target.toString() },
      });
    } catch (error) {
      liveErrors.set(
        scenario.fingerprint,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  const selectedContract = {
    ...contract,
    scenarios: selectedScenarios,
  };
  const verification = verifyContract(selectedContract, candidateRecordings);

  for (const scenario of verification.scenarios) {
    const liveError = liveErrors.get(scenario.fingerprint);
    if (!liveError) continue;
    scenario.ok = false;
    scenario.failures = [{
      field: "live_call",
      expected: "provider response",
      actual: liveError,
    }];
  }
  recomputeVerification(verification);

  return {
    total: contract.scenarios.length,
    selected: selectedScenarios.length,
    verification,
  };
}

export function formatCanaryResult(result) {
  const verificationText = formatVerification(result.verification)
    .replace(/^Aurat contract:/, "Aurat live canary:");
  return `[aurat] baseline drift canary (original recorded prompts): ${result.selected}/${result.total} contracted scenarios\n${verificationText}`;
}
