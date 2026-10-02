import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { WorkspaceStore } from "../platform/storage.js";
import { PlatformService } from "../platform/service.js";
import { handler } from "../platform/http.js";
import { uploadReport } from "./upload.js";
import { summary } from "./summary.js";

const workspaceToken = "test-workspace-token-at-least-32-characters";
async function setup(t) {
  const store = new WorkspaceStore(":memory:");
  const service = new PlatformService(store);
  const server = createServer(handler(service, { token: workspaceToken }));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = "http://127.0.0.1:" + server.address().port;
  const call = async (path, body, token = workspaceToken) => {
    const r = await fetch(base + path, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, body: await r.json() };
  };
  const project = (
    await call("/api/workspace", {
      action: "project",
      name: "CI project",
      repository: "https://github.com/8dazo/aurat",
    })
  ).body;
  const credential = (await call("/api/ci-tokens", { projectId: project.id }))
    .body;
  const dir = await mkdtemp(join(tmpdir(), "aurat-ci-"));
  t.after(async () => {
    await new Promise((r) => server.close(r));
    store.close();
    await rm(dir, { recursive: true, force: true });
  });
  return { store, service, base, call, project, credential, dir };
}
async function runCli(suite, report) {
  const child = spawn(
    process.execPath,
    ["src/cli.js", "test", "--suite", suite, "--report", report],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let out = "";
  child.stdout.on("data", (x) => (out += x));
  child.stderr.on("data", (x) => (out += x));
  const [code] = await once(child, "exit");
  return { code, out };
}
const metadata = {
  repository: "8dazo/aurat",
  runId: "1",
  runAttempt: "1",
  job: "gate",
};
test("actual changed-agent CLI report uploads, deduplicates and keeps a failed gate failed", async (t) => {
  const c = await setup(t);
  const original = JSON.parse(
    await readFile("examples/ticket-agent/suite.json", "utf8"),
  );
  const scenario = original.scenarios[0];
  scenario.cwd = resolve("examples/ticket-agent");
  scenario.recordings = resolve("examples/ticket-agent/model.jsonl");
  const suite = join(c.dir, "suite.json"),
    report = join(c.dir, "report.json");
  await writeFile(suite, JSON.stringify(original));
  const good = await runCli(suite, report);
  assert.equal(good.code, 0, good.out);
  // Fixtures are outside Git; explicitly identify the tested revision for this harness.
  const goodReport = JSON.parse(await readFile(report));
  goodReport.revision = "a".repeat(40);
  await writeFile(report, JSON.stringify(goodReport));
  const options = {
    baseUrl: c.base,
    token: c.credential.token,
    projectId: c.project.id,
    reportPath: report,
    ci: metadata,
    reportKey: "passing-agent",
  };
  const first = await uploadReport(options);
  assert.equal(first.ok, true);
  assert.equal(first.duplicate, false);
  assert.equal((await uploadReport(options)).duplicate, true);
  scenario.command.push("--duplicate");
  await writeFile(suite, JSON.stringify(original));
  const broken = await runCli(suite, report);
  assert.equal(broken.code, 1);
  const brokenReport = JSON.parse(await readFile(report));
  brokenReport.revision = "b".repeat(40);
  await writeFile(report, JSON.stringify(brokenReport));
  const saved = await uploadReport({
    ...options,
    reportKey: "duplicate-action",
  });
  assert.equal(saved.ok, false);
  assert.equal(
    (await c.store.get("runs", saved.id)).report.scenarios[0].process.timedOut,
    false,
  );
  assert.equal((await c.call("/api/workspace")).body.runs.length, 2);
  assert.match(summary(brokenReport), /regression: FAIL/);
});
test("CI credentials are project-scoped, write-only, hashed, revocable and repository checked", async (t) => {
  const c = await setup(t);
  const token = c.credential.token;
  assert.equal((await c.call("/api/workspace", null, token)).status, 401);
  assert.equal(
    JSON.stringify(await c.store.list("ci-tokens")).includes(token),
    false,
  );
  const listed = (await c.call("/api/ci-tokens")).body;
  assert.equal("tokenHash" in listed[0], false);
  assert.equal("token" in listed[0], false);
  const report = {
    version: 1,
    lane: "offline-application",
    revision: "a".repeat(40),
    createdAt: new Date().toISOString(),
    ok: false,
    scenarios: [
      {
        id: "bug",
        status: "FAIL",
        durationMs: 2,
        failures: [{ field: "tool", message: "Duplicate write" }],
      },
    ],
  };
  const body = {
    projectId: c.project.id,
    report,
    ci: { ...metadata, provider: "github-actions", reportKey: "gate" },
  };
  assert.equal(
    (await c.call("/api/ci/reports", body, workspaceToken)).status,
    401,
  );
  assert.equal(
    (
      await c.call(
        "/api/ci/reports",
        { ...body, projectId: "someone-else" },
        token,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await c.call(
        "/api/ci/reports",
        { ...body, ci: { ...body.ci, repository: "other/repo" } },
        token,
      )
    ).status,
    403,
  );
  assert.equal((await c.call("/api/ci/reports", body, token)).status, 201);
  const reordered = {
    ...body,
    report: Object.fromEntries(Object.entries(report).reverse()),
  };
  assert.equal((await c.call("/api/ci/reports", reordered, token)).status, 200);
  const different = {
    ...body,
    report: { ...report, revision: "b".repeat(40) },
  };
  assert.equal((await c.call("/api/ci/reports", different, token)).status, 409);
  await c.call("/api/ci-tokens/" + c.credential.id + "/revoke", {});
  assert.equal((await c.call("/api/ci/reports", body, token)).status, 401);
});
test("upload retries transient failures using the same payload and stops on auth errors", async (t) => {
  const c = await setup(t);
  const path = join(c.dir, "report.json");
  const report = {
    version: 1,
    lane: "offline-application",
    revision: "a".repeat(40),
    createdAt: new Date().toISOString(),
    ok: true,
    scenarios: [{ id: "pass", status: "PASS", durationMs: 1, failures: [] }],
  };
  await writeFile(path, JSON.stringify(report));
  const options = {
    baseUrl: c.base,
    token: c.credential.token,
    projectId: c.project.id,
    reportPath: path,
    ci: metadata,
    reportKey: "retry",
  };
  let calls = 0;
  const payloads = [];
  const result = await uploadReport(options, {
    fetchImpl: async (_, request) => {
      calls++;
      payloads.push(request.body);
      return calls === 1
        ? Response.json({}, { status: 503 })
        : Response.json({ id: "saved", ok: true, duplicate: false });
    },
  });
  assert.equal(result.id, "saved");
  assert.equal(payloads[0], payloads[1]);
  calls = 0;
  await assert.rejects(() =>
    uploadReport(options, {
      fetchImpl: async () => {
        calls++;
        return Response.json({}, { status: 401 });
      },
    }),
  );
  assert.equal(calls, 1);
  await assert.rejects(
    () => uploadReport({ ...options, baseUrl: "http://untrusted.example" }),
    /HTTPS/,
  );
});
test("summary escapes injected Markdown and HTML without exposing logs", () => {
  const report = {
    version: 1,
    lane: "offline-application",
    revision: "a".repeat(40),
    createdAt: new Date().toISOString(),
    ok: true,
    scenarios: [
      {
        id: "<script>|`",
        status: "PASS",
        durationMs: 1,
        failures: [],
        process: { stdout: "private log" },
      },
    ],
  };
  const value = summary(report);
  assert.ok(!value.includes("<script>"));
  assert.ok(!value.includes("private log"));
});
test("composite action script preserves failure status while writing detailed evidence", async (t) => {
  const c = await setup(t);
  const suite = JSON.parse(
    await readFile("examples/ticket-agent/suite.json", "utf8"),
  );
  suite.scenarios[0].cwd = resolve("examples/ticket-agent");
  suite.scenarios[0].recordings = resolve("examples/ticket-agent/model.jsonl");
  suite.scenarios[0].command.push("--duplicate");
  const suitePath = join(c.dir, "suite.json"),
    reportPath = join(c.dir, "report.json"),
    summaryPath = join(c.dir, "summary.md"),
    outputPath = join(c.dir, "output.txt");
  await writeFile(suitePath, JSON.stringify(suite));
  const action = await readFile("action.yml", "utf8");
  const run = action
    .split("      run: |\n")[1]
    .split("    - name: Preserve application report")[0]
    .split("\n")
    .map((line) => line.replace(/^        /, ""))
    .join("\n");
  const child = spawn("bash", ["-c", run], {
    env: {
      ...process.env,
      GITHUB_ACTION_PATH: process.cwd(),
      GITHUB_OUTPUT: outputPath,
      GITHUB_STEP_SUMMARY: summaryPath,
      AURAT_SUITE: suitePath,
      AURAT_REPORT: reportPath,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.resume();
  child.stderr.resume();
  const [code] = await once(child, "exit");
  assert.equal(code, 1);
  assert.match(await readFile(outputPath, "utf8"), /status=1/);
  assert.match(await readFile(summaryPath, "utf8"), /regression: FAIL/);
  assert.equal(JSON.parse(await readFile(reportPath)).ok, false);
});
