#!/usr/bin/env node
import { cp, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { runSuite, formatSuite, writeSuiteReport } from "./runner.js";
import { formatCanaryResult, runCanary } from "./canary.js";
import { loadAuratConfig } from "./config.js";
import { buildContract, formatVerification, readContract, verifyContract, writeContract } from "./contracts.js";
import { FAULT_NAMES } from "./faults.js";
import { convertOtlpDocument, formatOtelImport } from "./otel.js";
import { RecordingStore } from "./store.js";
import { formatSummary, summarizeRecordings } from "./inspect.js";
import { startAuratServer } from "./server.js";

function readFlag(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function storePath() {
  return process.env.AURAT_STORE_PATH ?? ".aurat/recordings.jsonl";
}

function contractPath() {
  return readFlag("--contract") ?? readFlag("--output") ?? process.env.AURAT_CONTRACT_PATH ?? ".aurat/contracts.json";
}

function usage() {
  console.log(`Aurat.ai — deterministic CI for AI applications\n\nUsage:\n  aurat test [--suite .aurat/suite.json] [--scenario id] [--report .aurat/report.json]\n  aurat init [directory]\n  aurat proxy [--mode live|record|replay] [--port 4010] [--config .aurat/config.json]\n              [--fault ${FAULT_NAMES.join("|")}] [--delay-ms 500]\n  aurat inspect\n  aurat contract [--output .aurat/contracts.json]\n  aurat verify [--contract .aurat/contracts.json]\n  aurat canary [--contract .aurat/contracts.json] [--limit 10]\n  aurat import-otel <otlp.json>\n\nEnvironment:\n  AURAT_MODE                live | record | replay\n  AURAT_PORT                local proxy port (default: 4010)\n  AURAT_UPSTREAM_BASE_URL   upstream API base (default: https://api.openai.com)\n  AURAT_UPSTREAM_API_KEY    optional provider key override\n  AURAT_STORE_PATH          recording file (default: .aurat/recordings.jsonl)\n  AURAT_CONFIG_PATH         matching config (default: .aurat/config.json)\n  AURAT_CONTRACT_PATH       contract file (default: .aurat/contracts.json)\n  AURAT_CANARY_LIMIT        max live canary scenarios (default: 10)\n  AURAT_FAULT               deterministic fault profile\n  AURAT_DELAY_MS            delay every model request before handling it\n`);
}

async function proxy() {
  const mode = readFlag("--mode") ?? process.env.AURAT_MODE ?? "replay";
  if (!["live", "record", "replay"].includes(mode)) throw new Error(`Invalid AURAT_MODE: ${mode}`);

  const port = Number(readFlag("--port") ?? process.env.AURAT_PORT ?? "4010");
  const delayMs = Number(readFlag("--delay-ms") ?? process.env.AURAT_DELAY_MS ?? "0");
  if (!Number.isFinite(delayMs) || delayMs < 0) throw new Error(`Invalid AURAT_DELAY_MS: ${delayMs}`);
  const fault = readFlag("--fault") ?? process.env.AURAT_FAULT ?? undefined;
  const configPath = readFlag("--config") ?? process.env.AURAT_CONFIG_PATH ?? ".aurat/config.json";
  const config = await loadAuratConfig(configPath);
  const { port: boundPort } = await startAuratServer({
    mode,
    port,
    upstreamBaseUrl: process.env.AURAT_UPSTREAM_BASE_URL ?? "https://api.openai.com",
    upstreamApiKey: process.env.AURAT_UPSTREAM_API_KEY ?? process.env.OPENAI_API_KEY,
    storePath: storePath(),
    matching: config.match,
    fault,
    delayMs,
  });

  console.log(`[aurat] proxy listening on http://127.0.0.1:${boundPort} (${mode})`);
  if (fault) console.log(`[aurat] fault=${fault}`);
  if (delayMs > 0) console.log(`[aurat] injected delay=${delayMs}ms`);
  if (config.match.ignoreBodyPaths.length || config.match.ignoreQueryParams.length) {
    console.log(`[aurat] matching config=${configPath} ignored-body=${config.match.ignoreBodyPaths.length} ignored-query=${config.match.ignoreQueryParams.length}`);
  }
}

async function recordings() {
  return new RecordingStore(storePath()).list();
}

async function inspect() {
  process.stdout.write(formatSummary(summarizeRecordings(await recordings())));
}

async function contract() {
  const path = contractPath();
  const built = buildContract(await recordings());
  if (built.scenarios.length === 0) throw new Error("No recordings found; record known-good scenarios before building a contract");
  await writeContract(path, built);
  console.log(`[aurat] wrote ${built.scenarios.length} behavioral contracts to ${path}`);
}

async function verify() {
  const path = contractPath();
  const result = verifyContract(await readContract(path), await recordings());
  process.stdout.write(formatVerification(result));
  if (!result.ok) process.exitCode = 1;
}

async function canary() {
  const rawLimit = readFlag("--limit") ?? process.env.AURAT_CANARY_LIMIT ?? "10";
  const limit = Number(rawLimit);
  if (!Number.isInteger(limit) || limit <= 0) throw new Error(`Invalid AURAT_CANARY_LIMIT: ${rawLimit}`);

  const result = await runCanary({
    contract: await readContract(contractPath()),
    recordings: await recordings(),
    upstreamBaseUrl: process.env.AURAT_UPSTREAM_BASE_URL ?? "https://api.openai.com",
    upstreamApiKey: process.env.AURAT_UPSTREAM_API_KEY ?? process.env.OPENAI_API_KEY,
    limit,
  });
  process.stdout.write(formatCanaryResult(result));
  if (!result.verification.ok) process.exitCode = 1;
}

async function importOtel() {
  const inputPath = process.argv[3] ?? readFlag("--input");
  if (!inputPath || inputPath.startsWith("--")) throw new Error("Usage: aurat import-otel <otlp.json>");
  const document = JSON.parse(await readFile(inputPath, "utf8"));
  const result = convertOtlpDocument(document);
  const store = new RecordingStore(storePath());
  for (const recording of result.recordings) await store.append(recording);
  process.stdout.write(formatOtelImport(result));
  if (result.imported === 0) process.exitCode = 2;
}

async function main() {
  const command = process.argv[2];
  if (!command || command === "--help" || command === "-h") {
    usage();
    return;
  }
  if (command === "test") {
    const result = await runSuite(readFlag("--suite") ?? ".aurat/suite.json", { scenarioId: readFlag("--scenario") });
    await writeSuiteReport(readFlag("--report") ?? ".aurat/report.json", result);
    process.stdout.write(formatSuite(result));
    if (!result.ok) process.exitCode = 1;
    return;
  }
  if (command === "init") {
    const target = resolve(process.argv[3] ?? ".aurat");
    await cp(fileURLToPath(new URL("../examples/ticket-agent/", import.meta.url)), target, { recursive: true, errorOnExist: true, force: false });
    console.log(`Created ${target}. Run aurat test --suite ${target}/suite.json`);
    return;
  }
  if (command === "proxy") return proxy();
  if (command === "inspect") return inspect();
  if (command === "contract") return contract();
  if (command === "verify") return verify();
  if (command === "canary") return canary();
  if (command === "import-otel") return importOtel();

  console.error(`Unknown command: ${command}`);
  usage();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
