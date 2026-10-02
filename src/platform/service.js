import { randomUUID } from "node:crypto";
import { convertOtlpDocument } from "../otel.js";
import { buildContract, verifyContract } from "../contracts.js";
import { redact } from "../redact.js";

export class InputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export function text(value, name, max = 150) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new InputError(`Invalid ${name}`);
  return value.trim();
}
const record = (data) => ({
  ...data,
  id: randomUUID(),
  createdAt: new Date().toISOString(),
});
export class PlatformService {
  constructor(store, { fetchImpl = fetch, env = process.env } = {}) {
    this.store = store;
    this.fetch = fetchImpl;
    this.env = env;
  }
  async project(id) {
    const project = await this.store.get("projects", text(id, "projectId"));
    if (!project) throw new InputError("Project not found", 404);
    return project;
  }
  async workspace() {
    return {
      projects: await this.store.list("projects"),
      runs: (await this.store.list("runs")).slice(0, 100),
    };
  }
  async createProject(input) {
    const repository = text(input.repository, "repository", 250).replace(
      /\/$/,
      "",
    );
    if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(repository))
      throw new InputError("Use a GitHub repository URL");
    return this.store.put(
      "projects",
      record({
        name: text(input.name, "name", 80),
        repository,
        baselineId: null,
      }),
    );
  }
  async connect(input) {
    const project = await this.project(input.projectId);
    if (!["github", "otlp"].includes(input.type))
      throw new InputError("Supported connectors: github, otlp");
    if (
      (await this.store.list("connections")).some(
        (c) => c.projectId === project.id && c.type === input.type,
      )
    )
      throw new InputError("Connector already exists", 409);
    let metadata = { format: "otlp-json", mode: "push" };
    if (input.type === "github") {
      const [owner, repo] = project.repository
        .slice("https://github.com/".length)
        .split("/");
      const headers = {
        Accept: "application/vnd.github+json",
        "User-Agent": "aurat-control-plane",
      };
      if (this.env.AURAT_GITHUB_TOKEN)
        headers.Authorization = `Bearer ${this.env.AURAT_GITHUB_TOKEN}`;
      const response = await this.fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
        {
          headers,
          redirect: "error",
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!response.ok)
        throw new InputError(
          `GitHub repository verification failed (${response.status})`,
          502,
        );
      const bytes = await response.text();
      if (bytes.length > 1048576)
        throw new InputError("GitHub response too large", 502);
      const data = JSON.parse(bytes);
      if (
        typeof data.full_name !== "string" ||
        data.full_name.toLowerCase() !== `${owner}/${repo}`.toLowerCase()
      )
        throw new InputError("GitHub repository identity mismatch", 502);
      metadata = {
        repository: data.full_name,
        defaultBranch: data.default_branch,
        private: !!data.private,
      };
    }
    return this.store.put(
      "connections",
      record({
        projectId: project.id,
        type: input.type,
        status: "connected",
        metadata,
      }),
    );
  }
  async ingest(input) {
    const project = await this.project(input.projectId);
    if (!input.document || typeof input.document !== "object")
      throw new InputError("Expected an OTLP JSON document");
    // Redact before producing both the request fingerprint and encoded response.
    let result;
    try {
      result = convertOtlpDocument(redact(input.document));
    } catch {
      throw new InputError("Malformed OTLP spans");
    }
    if (!result.scanned) throw new InputError("No spans in document");
    if (result.scanned > 2000)
      throw new InputError("Limit: 2,000 spans per import");
    const batch = record({
      projectId: project.id,
      recordings: result.recordings,
    });
    if (result.imported) await this.store.put("batches", batch);
    return {
      batchId: result.imported ? batch.id : null,
      scanned: result.scanned,
      imported: result.imported,
      skipped: result.skipped,
    };
  }
  async syncConnection(id) {
    const connection = await this.store.get(
      "connections",
      text(id, "connectionId"),
    );
    if (!connection) throw new InputError("Connection not found", 404);
    if (connection.type !== "github")
      throw new InputError(
        "OTLP connections receive push imports; no remote sync",
      );
    const project = await this.project(connection.projectId);
    const [owner, repo] = project.repository
      .slice("https://github.com/".length)
      .split("/");
    const headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": "aurat-control-plane",
    };
    if (this.env.AURAT_GITHUB_TOKEN)
      headers.Authorization = `Bearer ${this.env.AURAT_GITHUB_TOKEN}`;
    const response = await this.fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs?per_page=20`,
      { headers, redirect: "error", signal: AbortSignal.timeout(15000) },
    );
    if (!response.ok)
      throw new InputError(
        `GitHub workflow sync failed (${response.status})`,
        502,
      );
    const payload = await response.text();
    if (payload.length > 1048576)
      throw new InputError("GitHub response too large", 502);
    const data = JSON.parse(payload);
    if (!Array.isArray(data.workflow_runs))
      throw new InputError("Invalid GitHub workflow response", 502);
    connection.workflowRuns = data.workflow_runs
      .slice(0, 20)
      .map((run) => ({
        id: run.id,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        revision: run.head_sha,
        url: run.html_url,
        createdAt: run.created_at,
      }));
    connection.lastSyncedAt = new Date().toISOString();
    return this.store.put("connections", connection);
  }
  async recordings(projectId) {
    await this.project(projectId);
    // Apply batches in chronological order so later evidence replaces old fingerprints.
    return (await this.store.list("batches"))
      .filter((b) => b.projectId === projectId)
      .reverse()
      .flatMap((b) => b.recordings);
  }
  async createContract(input) {
    const recordings = await this.recordings(input.projectId);
    if (!recordings.length)
      throw new InputError(
        "Import supported model spans before creating a contract",
      );
    return this.store.put(
      "contracts",
      record({
        projectId: input.projectId,
        name: text(input.name ?? "Recorded behavior", "name"),
        contract: buildContract(recordings),
      }),
    );
  }
  async verify(input) {
    await this.project(input.projectId);
    const contract = await this.store.get(
      "contracts",
      text(input.contractId, "contractId"),
    );
    if (!contract || contract.projectId !== input.projectId)
      throw new InputError("Contract not found", 404);
    const started = Date.now();
    if (input.revision !== undefined && input.revision !== null)
      text(input.revision, "revision", 100);
    const evidence = verifyContract(
      contract.contract,
      await this.recordings(input.projectId),
    );
    const report = {
      version: 1,
      lane: "stored-trace-contract",
      revision: input.revision ?? null,
      createdAt: new Date().toISOString(),
      ok: evidence.ok,
      scenarios: evidence.scenarios.map((s) => ({
        id: s.fingerprint,
        status: s.ok ? "PASS" : "FAIL",
        durationMs: 0,
        failures: s.failures.map((f) => ({
          field: f.field,
          message: JSON.stringify({ expected: f.expected, actual: f.actual }),
        })),
        events: [],
      })),
    };
    // Unexpected fingerprints are failures too; don't report a misleading green summary.
    for (const fingerprint of evidence.unexpected)
      report.scenarios.push({
        id: fingerprint,
        status: "FAIL",
        durationMs: 0,
        failures: [{ field: "recording", message: "Unexpected model request" }],
        events: [],
      });
    const run = record({
      projectId: input.projectId,
      label: text(input.label ?? "Stored trace contract verification", "label"),
      contractId: contract.id,
      report,
      evidence,
      durationMs: Date.now() - started,
    });
    if (input.jobId) {
      run.id = input.jobId;
      run.jobId = input.jobId;
    }
    return this.store.put("runs", run);
  }
  async createTrigger(input) {
    await this.project(input.projectId);
    if (!["manual", "github-webhook"].includes(input.type))
      throw new InputError("Supported triggers: manual, github-webhook");
    const contract = await this.store.get(
      "contracts",
      text(input.contractId, "contractId"),
    );
    if (!contract || contract.projectId !== input.projectId)
      throw new InputError("Contract not found", 404);
    if (
      input.type === "github-webhook" &&
      !this.env.AURAT_GITHUB_WEBHOOK_SECRET
    )
      throw new InputError(
        "Configure AURAT_GITHUB_WEBHOOK_SECRET on the server first",
      );
    return this.store.put(
      "triggers",
      record({
        projectId: input.projectId,
        contractId: contract.id,
        type: input.type,
        action: "verify-stored-contract",
        enabled: true,
      }),
    );
  }
  async fire(id, metadata = {}, deliveryId) {
    const trigger = await this.store.get("triggers", text(id, "triggerId"));
    if (!trigger?.enabled) throw new InputError("Trigger not found", 404);
    return this.store.enqueue(
      {
        triggerId: trigger.id,
        projectId: trigger.projectId,
        contractId: trigger.contractId,
        ...metadata,
      },
      deliveryId,
    );
  }
  async workOne() {
    const job = await this.store.claim();
    if (!job) return null;
    try {
      // A recovered job reuses its saved run instead of generating duplicate results.
      let run = (await this.store.list("runs")).find((r) => r.jobId === job.id);
      if (!run) {
        run = await this.verify({
          projectId: job.projectId,
          contractId: job.contractId,
          revision: job.revision ?? null,
          jobId: job.id,
        });
      }
      await this.store.finish(job.id, { runId: run.id, ok: run.report.ok });
    } catch (error) {
      await this.store.finish(
        job.id,
        null,
        error instanceof InputError
          ? error.message
          : "Contract verification failed",
      );
    }
    return job;
  }
}
