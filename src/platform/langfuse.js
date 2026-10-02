import { createHash } from "node:crypto";
import { InputError } from "./input.js";
import { canonicalJson } from "../fingerprint.js";
import { langfuseObservationToRecording } from "../langfuse.js";

const origins = new Set([
  "https://cloud.langfuse.com",
  "https://us.cloud.langfuse.com",
  "https://jp.cloud.langfuse.com",
  "https://hipaa.cloud.langfuse.com",
]);
const PAGE_SIZE = 50;
const MAX_BYTES = 4 * 1024 * 1024;
const hash = (value) =>
  createHash("sha256").update(canonicalJson(value)).digest("hex");
const identifier = (value) =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(value);
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
function config(env) {
  let base;
  try {
    base = new URL(env.AURAT_LANGFUSE_BASE_URL || "https://cloud.langfuse.com");
  } catch {}
  if (
    !base ||
    !origins.has(base.origin) ||
    base.pathname !== "/" ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  )
    throw new InputError(
      "AURAT_LANGFUSE_BASE_URL must be a supported Langfuse Cloud regional origin",
      503,
    );
  const publicKey = env.AURAT_LANGFUSE_PUBLIC_KEY,
    secretKey = env.AURAT_LANGFUSE_SECRET_KEY;
  if (
    typeof publicKey !== "string" ||
    typeof secretKey !== "string" ||
    !/^[^\s:]{1,512}$/.test(publicKey) ||
    !/^[^\s:]{1,512}$/.test(secretKey)
  )
    throw new InputError(
      "Configure AURAT_LANGFUSE_PUBLIC_KEY and AURAT_LANGFUSE_SECRET_KEY on the server",
      503,
    );
  return {
    base: base.origin,
    authorization:
      "Basic " + Buffer.from(`${publicKey}:${secretKey}`).toString("base64"),
  };
}
async function json(service, config, path, signal) {
  let response;
  try {
    response = await service.fetch(new URL(path, config.base).href, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: config.authorization,
      },
      redirect: "error",
      signal,
    });
  } catch {
    throw new InputError(
      "Langfuse request failed or timed out; retry the same page",
      502,
    );
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    if (response.status === 429)
      throw new InputError(
        "Langfuse rate limit reached; wait and retry the same page",
        429,
      );
    if ([401, 403].includes(response.status))
      throw new InputError(
        "Langfuse authentication failed; check server credentials and trace read access",
        502,
      );
    throw new InputError(
      `Langfuse request failed (${response.status}); no page imported`,
      502,
    );
  }
  if (Number(response.headers.get("content-length")) > MAX_BYTES) {
    await response.body?.cancel().catch(() => {});
    throw new InputError(
      "Langfuse page exceeds 4 MiB; narrow the time window",
      502,
    );
  }
  if (!response.body) throw new InputError("Empty Langfuse response", 502);
  const reader = response.body.getReader(),
    chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES)
        throw new InputError(
          "Langfuse page exceeds 4 MiB; narrow the time window",
          502,
        );
      chunks.push(Buffer.from(value));
    }
    const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!object(data)) throw Error("Invalid JSON object");
    return data;
  } catch (e) {
    throw e instanceof InputError
      ? e
      : new InputError(
          "Invalid or interrupted Langfuse response; retry the same page",
          502,
        );
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
async function remoteProject(service, cfg, signal) {
  const result = await json(service, cfg, "/api/public/projects", signal);
  if (
    !Array.isArray(result.data) ||
    result.data.length !== 1 ||
    !identifier(result.data[0]?.id) ||
    typeof result.data[0]?.name !== "string"
  )
    throw new InputError(
      "Langfuse credentials must identify exactly one project",
      502,
    );
  return { id: result.data[0].id, name: result.data[0].name.slice(0, 150) };
}
export async function verifyLangfuse(service) {
  const cfg = config(service.env);
  const project = await remoteProject(service, cfg, AbortSignal.timeout(15000));
  return {
    baseUrl: cfg.base,
    remoteProjectId: project.id,
    projectName: project.name,
    apiVersion: "v2",
    mode: "pull",
  };
}
function windowInput(input) {
  if (
    !object(input) ||
    Object.keys(input).some(
      (key) => !["fromStartTime", "toStartTime", "cursor"].includes(key),
    )
  )
    throw new InputError("Use fromStartTime, toStartTime and optional cursor");
  const parse = (value) =>
    typeof value === "string" &&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(
      value,
    )
      ? Date.parse(value)
      : NaN;
  const from = parse(input.fromStartTime),
    to = parse(input.toStartTime);
  if (
    !Number.isFinite(from) ||
    !Number.isFinite(to) ||
    from >= to ||
    to - from > 7 * 86400000 ||
    to > Date.now() + 60000
  )
    throw new InputError(
      "Choose a past ISO-8601 time window of at most seven days",
    );
  if (
    input.cursor !== undefined &&
    (typeof input.cursor !== "string" ||
      !input.cursor.length ||
      input.cursor.length > 8192)
  )
    throw new InputError("Invalid Langfuse cursor");
  return {
    from,
    to,
    fromStartTime: new Date(from).toISOString(),
    toStartTime: new Date(to).toISOString(),
    cursor: input.cursor,
  };
}
export async function importLangfusePage(service, connection, input) {
  const window = windowInput(input);
  await service.project(connection.projectId);
  const cfg = config(service.env),
    signal = AbortSignal.timeout(20000);
  if (cfg.base !== connection.metadata.baseUrl)
    throw new InputError(
      "Langfuse region changed; restore the configured region before importing",
      409,
    );
  const project = await remoteProject(service, cfg, signal);
  if (project.id !== connection.metadata.remoteProjectId)
    throw new InputError(
      "Langfuse project changed; restore credentials for the connected project",
      409,
    );
  const query = new URLSearchParams({
    type: "GENERATION",
    fields: "core,basic,io,model",
    limit: String(PAGE_SIZE),
    fromStartTime: window.fromStartTime,
    toStartTime: window.toStartTime,
  });
  if (window.cursor) query.set("cursor", window.cursor);
  const result = await json(
    service,
    cfg,
    "/api/public/v2/observations?" + query,
    signal,
  );
  if (
    !Array.isArray(result.data) ||
    result.data.length > PAGE_SIZE ||
    !object(result.meta)
  )
    throw new InputError("Invalid Langfuse observation page", 502);
  const cursor = result.meta.cursor ?? null;
  if (
    cursor !== null &&
    (typeof cursor !== "string" ||
      !cursor.length ||
      cursor.length > 8192 ||
      cursor === window.cursor ||
      !result.data.length)
  )
    throw new InputError(
      "Invalid Langfuse pagination cursor; no page imported",
      502,
    );
  // Validate the entire page's scope before any write, even if the provider or a
  // reused cursor returns data outside the requested project/window.
  if (
    result.data.some(
      (row) =>
        !object(row) ||
        row.projectId !== project.id ||
        !identifier(row.id) ||
        !identifier(row.traceId) ||
        !Number.isFinite(Date.parse(row.startTime)) ||
        Date.parse(row.startTime) < window.from ||
        Date.parse(row.startTime) >= window.to,
    )
  )
    throw new InputError(
      "Langfuse observation identity or time window mismatch; no page imported",
      502,
    );
  const summary = {
    scanned: result.data.length,
    imported: 0,
    duplicates: 0,
    skipped: {},
    nextCursor: cursor,
    complete: cursor === null,
  };
  for (const observation of result.data) {
    const converted = langfuseObservationToRecording(observation);
    if (converted.skip) {
      summary.skipped[converted.skip] =
        (summary.skipped[converted.skip] ?? 0) + 1;
      continue;
    }
    const recording = converted.recording;
    const source = {
      provider: "langfuse",
      baseUrl: cfg.base,
      remoteProjectId: project.id,
      traceId: observation.traceId,
      observationId: observation.id,
    };
    recording.metadata = {
      ...recording.metadata,
      baseUrl: cfg.base,
      remoteProjectId: project.id,
    };
    const batch = {
      id: "langfuse-" + hash([connection.projectId, source]),
      projectId: connection.projectId,
      // Provider order, not pagination/import order, decides latest evidence.
      createdAt: recording.createdAt,
      importedAt: new Date().toISOString(),
      source,
      digest: hash(recording),
      recordings: [recording],
    };
    const saved = await service.store.putIfAbsent("batches", batch);
    if (saved.created) summary.imported++;
    else if (saved.value.digest === batch.digest) summary.duplicates++;
    else
      summary.skipped.changed_observation =
        (summary.skipped.changed_observation ?? 0) + 1;
  }
  connection.lastSyncedAt = new Date().toISOString();
  connection.lastImport = {
    ...summary,
    nextCursor: undefined,
    fromStartTime: window.fromStartTime,
    toStartTime: window.toStartTime,
    finishedAt: connection.lastSyncedAt,
  };
  await service.store.put("connections", connection);
  return summary;
}
