import { createHash, randomBytes, randomUUID } from "node:crypto";
import { InputError, text } from "./service.js";
import { parseReport } from "./report.js";
import { canonicalJson } from "../fingerprint.js";

const hash = (value) => createHash("sha256").update(value).digest("hex");
export async function issueCiToken(service, input) {
  await service.project(input.projectId);
  const token = "aurat_ci_" + randomBytes(32).toString("hex");
  const value = {
    id: randomUUID(),
    projectId: input.projectId,
    name: text(input.name ?? "GitHub Actions", "name"),
    tokenHash: hash(token),
    scope: "reports:write",
    createdAt: new Date().toISOString(),
    revokedAt: null,
  };
  await service.store.put("ci-tokens", value);
  const { tokenHash, ...metadata } = value;
  return { ...metadata, token };
}
export async function authenticateCi(service, authorization) {
  if (
    typeof authorization !== "string" ||
    !/^Bearer aurat_ci_[a-f0-9]{64}$/.test(authorization)
  )
    throw new InputError("CI report token required", 401);
  const digest = hash(authorization.slice(7));
  const token = (await service.store.list("ci-tokens")).find(
    (t) =>
      t.tokenHash === digest && !t.revokedAt && t.scope === "reports:write",
  );
  if (!token)
    throw new InputError("CI report token is invalid or revoked", 401);
  return token;
}
export async function receiveCiReport(service, credential, input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new InputError("Expected a JSON object");
  const project = await service.project(credential.projectId);
  if (input.projectId !== project.id)
    throw new InputError("CI token belongs to another project", 403);
  const ci = input.ci;
  if (!ci || ci.provider !== "github-actions")
    throw new InputError("Expected GitHub Actions run metadata");
  const repository = text(ci.repository, "repository", 250);
  if (
    `https://github.com/${repository}`.toLowerCase() !==
    project.repository.toLowerCase()
  )
    throw new InputError("Repository does not match project", 403);
  const runId = text(ci.runId, "runId", 30),
    attempt = text(ci.runAttempt, "runAttempt", 6),
    job = text(ci.job, "job", 150),
    reportKey = text(ci.reportKey, "reportKey", 200);
  if (!/^\d+$/.test(runId) || !/^[1-9]\d*$/.test(attempt))
    throw new InputError("Invalid GitHub run identity");
  const report = parseReport(input.report);
  if (!/^[a-f0-9]{40,64}$/i.test(report.revision ?? ""))
    throw new InputError("CI report must identify the tested commit");
  const label = text(
    input.label ?? `${job.slice(0, 80)} · run ${runId}`,
    "label",
  );
  const source = {
    provider: "github-actions",
    repository,
    runId,
    runAttempt: attempt,
    job,
    reportKey,
    url: `https://github.com/${repository}/actions/runs/${runId}`,
  };
  const id =
    "ci-" +
    hash(
      JSON.stringify([
        project.id,
        repository.toLowerCase(),
        runId,
        attempt,
        job,
        reportKey,
      ]),
    );
  const value = {
    id,
    projectId: project.id,
    label,
    createdAt: new Date().toISOString(),
    report,
    source,
    reportDigest: hash(canonicalJson(report)),
  };
  const saved = await service.store.putIfAbsent("runs", value);
  if (!saved.created && saved.value.reportDigest !== value.reportDigest)
    throw new InputError(
      "This CI delivery already has a different report; use a unique report key per matrix shard",
      409,
    );
  return {
    id: saved.value.id,
    duplicate: !saved.created,
    ok: saved.value.report.ok,
  };
}
