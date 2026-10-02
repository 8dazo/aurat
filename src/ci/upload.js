import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseReport } from "../platform/report.js";

export async function uploadReport(
  { baseUrl, token, projectId, reportPath, ci, reportKey, label },
  { fetchImpl = fetch } = {},
) {
  let base;
  try {
    base = new URL(baseUrl);
  } catch {
    throw Error("Set a valid workspace API URL");
  }
  const local = ["127.0.0.1", "localhost"].includes(base.hostname);
  if (
    (base.protocol !== "https:" && !(base.protocol === "http:" && local)) ||
    base.username ||
    base.password ||
    base.pathname !== "/" ||
    base.search ||
    base.hash
  )
    throw Error("Use an HTTPS workspace origin or local HTTP origin");
  if (!/^aurat_ci_[a-f0-9]{64}$/.test(token ?? ""))
    throw Error("Set a project-scoped CI report token");
  const bytes = await readFile(resolve(reportPath));
  if (bytes.length > 1048576) throw Error("Report exceeds 1 MiB");
  const report = parseReport(JSON.parse(bytes.toString()));
  const payload = JSON.stringify({
    projectId,
    label,
    report,
    ci: { ...ci, provider: "github-actions", reportKey },
  });
  if (Buffer.byteLength(payload) > 1048576)
    throw Error("Report and CI metadata exceed 1 MiB");
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetchImpl(new URL("/api/ci/reports", base), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: payload,
        redirect: "error",
        signal: AbortSignal.timeout(30000),
      });
      if (response.ok) {
        const result = await response.json();
        if (typeof result.id !== "string" || typeof result.ok !== "boolean")
          throw Error("Invalid report acknowledgement");
        return result;
      }
      const error = Error(
        `Workspace report upload rejected (${response.status})`,
      );
      error.retryable = response.status === 429 || response.status >= 500;
      throw error;
    } catch (e) {
      lastError = e;
      if (e.retryable === false) throw e;
      if (attempt < 2)
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
  }
  throw lastError;
}
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  try {
    const e = process.env;
    const result = await uploadReport({
      baseUrl: e.AURAT_API_URL,
      token: e.AURAT_REPORT_TOKEN,
      projectId: e.AURAT_PROJECT_ID,
      reportPath: e.AURAT_REPORT ?? ".aurat/report.json",
      reportKey: e.AURAT_REPORT_KEY ?? `${e.GITHUB_JOB}:default`,
      label: e.AURAT_REPORT_LABEL,
      ci: {
        repository: e.GITHUB_REPOSITORY,
        runId: e.GITHUB_RUN_ID,
        runAttempt: e.GITHUB_RUN_ATTEMPT,
        job: e.AURAT_REPORT_JOB ?? e.GITHUB_JOB,
      },
    });
    console.log(
      `Aurat report ${result.duplicate ? "already delivered" : "delivered"}: ${result.id} (${result.ok ? "PASS" : "FAIL"})`,
    );
  } catch {
    console.error(
      "Aurat report delivery failed. Check the API URL, scoped token, project and report key.",
    );
    process.exitCode = 1;
  }
}
