import { spawn, execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { RecordingStore } from "./store.js";
import { startAuratServer } from "./server.js";
import { readSuite, validateToolFixtures } from "./suite.js";
import { loadAuratConfig } from "./config.js";
import { checkExecution } from "./assertions.js";
import { redact, redactText } from "./redact.js";

const guard = pathToFileURL(fileURLToPath(new URL("./network-guard.js", import.meta.url))).href;
const environmentKeys = ["PATH", "HOME", "USERPROFILE", "SYSTEMROOT", "WINDIR", "COMSPEC", "PATHEXT", "TMPDIR", "TEMP", "TMP", "LANG", "LC_ALL"];

function childEnvironment(extra) {
  return { ...Object.fromEntries(environmentKeys.filter((k) => process.env[k]).map((k) => [k, process.env[k]])),
    CI: "true", NO_COLOR: "1", NODE_OPTIONS: `--import=${guard}`, ...extra };
}

function execute(command, cwd, env, timeoutMs) {
  return new Promise((resolveResult) => {
    let timedOut = false;
    let outputOverflow = false;
    let bytes = 0;
    let stdout = "";
    let stderr = "";
    let spawnError;
    const child = spawn(command[0] === "node" ? process.execPath : command[0], command.slice(1), {
      cwd, env, shell: false, detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"],
    });
    const kill = () => {
      try {
        if (process.platform !== "win32" && child.pid) process.kill(-child.pid, "SIGKILL");
        else child.kill("SIGKILL");
      } catch (error) { if (error.code !== "ESRCH") spawnError ??= error.message; }
    };
    const timer = setTimeout(() => { timedOut = true; kill(); }, timeoutMs);
    const receive = (kind) => (chunk) => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > 1024 * 1024) { outputOverflow = true; kill(); return; }
      if (kind === "stdout") stdout += chunk; else stderr += chunk;
    };
    child.stdout.setEncoding("utf8").on("data", receive("stdout"));
    child.stderr.setEncoding("utf8").on("data", receive("stderr"));
    child.on("error", (error) => { spawnError = error.message; });
    // Terminate descendants even if the entrypoint exits before them.
    child.on("exit", kill);
    child.on("close", (exitCode, signal) => {
      clearTimeout(timer);
      resolveResult({ exitCode, signal, timedOut, outputOverflow, spawnError,
        stdout: redactText(stdout).slice(-16000), stderr: redactText(stderr).slice(-16000) });
    });
  });
}

async function runScenario(scenario, root) {
  const started = performance.now();
  const work = await mkdtemp(join(tmpdir(), "aurat-run-"));
  let server;
  const failures = [];
  const fail = (field, message) => failures.push({ field, message });
  try {
    const cwd = resolve(root, scenario.cwd ?? ".");
    const tools = validateToolFixtures(typeof scenario.tools === "string"
      ? JSON.parse(await readFile(resolve(root, scenario.tools), "utf8")) : scenario.tools ?? []);
    const toolsPath = join(work, "tools.json");
    const eventsPath = join(work, "events.jsonl");
    await writeFile(toolsPath, JSON.stringify(redact(tools)), { mode: 0o600 });
    await writeFile(eventsPath, "", { mode: 0o600 });
    let storePath = join(work, "empty.jsonl");
    if (scenario.recordings) {
      storePath = resolve(root, scenario.recordings);
      // Unlike a standalone proxy, a missing configured fixture is an error.
      await readFile(storePath);
    }
    const store = new RecordingStore(storePath);
    const recordings = await store.list();
    for (const item of recordings) {
      if (!item?.fingerprint || !item?.request || !item?.response || !Number.isInteger(item.response.status)) throw new Error("Invalid model recording");
    }
    if (scenario.config) await readFile(resolve(root, scenario.config));
    const config = scenario.config ? await loadAuratConfig(resolve(root, scenario.config)) : { match: {} };
    const misses = [];
    const proxy = await startAuratServer({ mode: "replay", port: 0, store, matching: config.match,
      onReplay: (event) => { if (!event.hit) misses.push(event.fingerprint); } });
    server = proxy.server;
    const proxyUrl = `http://127.0.0.1:${proxy.port}`;
    const processResult = await execute(scenario.command, cwd, childEnvironment({
      AURAT_MODE: "replay", AURAT_PROXY_URL: proxyUrl, OPENAI_BASE_URL: `${proxyUrl}/v1`,
      OPENAI_API_KEY: "aurat-offline-placeholder", AURAT_EVENTS_PATH: eventsPath, AURAT_TOOLS_PATH: toolsPath,
      AURAT_SCENARIO_ID: scenario.id,
    }), scenario.timeoutMs ?? 30000);
    const events = (await readFile(eventsPath, "utf8")).split("\n").filter(Boolean).map((line) => JSON.parse(line));
    const coverage = await store.coverage();
    const toolEvents = events.filter((e) => e.type === "tool");
    if (processResult.spawnError) fail("process", processResult.spawnError);
    if (processResult.timedOut) fail("timeout", `Application exceeded ${scenario.timeoutMs ?? 30000}ms`);
    if (processResult.outputOverflow) fail("output", "Application logs exceeded 1 MiB");
    if (processResult.exitCode !== 0) fail("exitCode", `Application exited ${processResult.exitCode ?? processResult.signal}`);
    const guarded = events.some((e) => e.type === "guard_ready");
    if (!guarded) fail("coverage", "Node HTTP guard did not initialize. Use a Node entrypoint that inherits NODE_OPTIONS.");
    for (const e of events.filter((e) => e.type === "network_blocked")) fail("network", `Blocked ${e.method} ${e.origin}`);
    for (const fingerprint of misses) fail("replay", `Unrecorded or exhausted model request ${fingerprint}`);
    if (coverage.pending.length) fail("coverage", `${coverage.pending.length} model interactions were not consumed`);
    for (const e of toolEvents.filter((e) => !e.matched)) fail("tool", `Unrecorded or mismatched call ${e.index + 1}: ${e.name}`);
    // Fixtures belong to one application process; children must not each replay the same queue.
    if (toolEvents.some((event, index) => event.index !== index)) fail("tool", "Tool occurrence indices are duplicated or out of order; use one tool-owning process per scenario");
    const consumedTools = new Set(toolEvents.filter((e) => e.matched).map(e => e.index)).size;
    if (consumedTools < tools.length) fail("coverage", `${tools.length - consumedTools} tool interactions were not consumed`);
    failures.push(...checkExecution(scenario.expect, events));
    const infra = processResult.spawnError || processResult.timedOut || processResult.outputOverflow;
    const incomplete = !guarded || coverage.pending.length || consumedTools < tools.length || misses.length;
    return { id: scenario.id, status: infra ? "INFRA_ERROR" : failures.length ? (incomplete ? "INCOMPLETE" : "FAIL") : "PASS",
      durationMs: Math.round(performance.now() - started), failures, process: processResult,
      coverage: { model: coverage, tools: { total: tools.length, consumed: consumedTools }, httpGuard: guarded, osSandbox: false },
      events: redact(events.filter((e) => e.type !== "guard_ready")) };
  } catch (error) {
    return { id: scenario.id, status: "INFRA_ERROR", failures: [{ field: "setup", message: redactText(error.message) }], durationMs: Math.round(performance.now() - started) };
  } finally {
    if (server) {
      server.closeAllConnections();
      await new Promise((done) => server.close(done));
    }
    await rm(work, { recursive: true, force: true });
  }
}

export async function runSuite(path, { scenarioId } = {}) {
  if (Number(process.versions.node.split(".")[0]) < 22) throw new Error("Aurat application replay requires Node 22 or newer (HTTP interceptor requirement)");
  const absolute = resolve(path);
  const suite = await readSuite(absolute);
  const selected = scenarioId ? suite.scenarios.filter((s) => s.id === scenarioId) : suite.scenarios;
  if (!selected.length) throw new Error(`No scenario matched ${scenarioId}`);
  let revision = null;
  try { revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: dirname(absolute), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { /* not all apps are git repositories */ }
  const scenarios = [];
  for (const scenario of selected) scenarios.push(await runScenario(scenario, dirname(absolute)));
  return { version: 1, lane: "offline-application", revision, createdAt: new Date().toISOString(),
    ok: scenarios.every((s) => s.status === "PASS"), scenarios };
}

export function formatSuite(result) {
  const lines = [`Aurat application regression: ${result.ok ? "PASS" : "FAIL"}`, `Lane: ${result.lane} | revision: ${result.revision ?? "unknown"}`];
  for (const scenario of result.scenarios) {
    lines.push(`\n${scenario.status} ${scenario.id} (${scenario.durationMs}ms)`);
    for (const failure of scenario.failures) lines.push(`  ✗ ${failure.field}: ${failure.message}`);
    if (scenario.coverage) lines.push(`  Coverage: model ${scenario.coverage.model.consumed}/${scenario.coverage.model.total}, tools ${scenario.coverage.tools.consumed}/${scenario.coverage.tools.total}; Node HTTP guard ${scenario.coverage.httpGuard ? "on" : "off"}; OS sandbox not provided`);
    if (scenario.status !== "PASS" && scenario.process?.stderr) lines.push(`  Application stderr:\n${scenario.process.stderr}`);
  }
  return `${lines.join("\n")}\n`;
}

export async function writeSuiteReport(path, result) {
  await mkdir(dirname(resolve(path)), { recursive: true });
  await writeFile(path, `${JSON.stringify(redact(result), null, 2)}\n`, { mode: 0o600 });
}
