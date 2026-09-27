#!/usr/bin/env node
import { loadAuratConfig } from "./config.js";
import { RecordingStore } from "./store.js";
import { formatSummary, summarizeRecordings } from "./inspect.js";
import { startAuratServer } from "./server.js";

function readFlag(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function usage() {
  console.log(`Aurat.ai — deterministic CI for AI applications\n\nUsage:\n  aurat proxy [--mode live|record|replay] [--port 4010] [--config .aurat/config.json]\n  aurat inspect\n\nEnvironment:\n  AURAT_MODE                live | record | replay\n  AURAT_PORT                local proxy port (default: 4010)\n  AURAT_UPSTREAM_BASE_URL   upstream API base (default: https://api.openai.com)\n  AURAT_UPSTREAM_API_KEY    optional provider key override\n  AURAT_STORE_PATH          recording file (default: .aurat/recordings.jsonl)\n  AURAT_CONFIG_PATH         matching config (default: .aurat/config.json)\n`);
}

async function proxy() {
  const mode = readFlag("--mode") ?? process.env.AURAT_MODE ?? "replay";
  if (!["live", "record", "replay"].includes(mode)) throw new Error(`Invalid AURAT_MODE: ${mode}`);

  const port = Number(readFlag("--port") ?? process.env.AURAT_PORT ?? "4010");
  const configPath = readFlag("--config") ?? process.env.AURAT_CONFIG_PATH ?? ".aurat/config.json";
  const config = await loadAuratConfig(configPath);
  const { port: boundPort } = await startAuratServer({
    mode,
    port,
    upstreamBaseUrl: process.env.AURAT_UPSTREAM_BASE_URL ?? "https://api.openai.com",
    upstreamApiKey: process.env.AURAT_UPSTREAM_API_KEY ?? process.env.OPENAI_API_KEY,
    storePath: process.env.AURAT_STORE_PATH ?? ".aurat/recordings.jsonl",
    matching: config.match,
  });

  console.log(`[aurat] proxy listening on http://127.0.0.1:${boundPort} (${mode})`);
  if (config.match.ignoreBodyPaths.length || config.match.ignoreQueryParams.length) {
    console.log(`[aurat] matching config=${configPath} ignored-body=${config.match.ignoreBodyPaths.length} ignored-query=${config.match.ignoreQueryParams.length}`);
  }
}

async function inspect() {
  const store = new RecordingStore(process.env.AURAT_STORE_PATH ?? ".aurat/recordings.jsonl");
  process.stdout.write(formatSummary(summarizeRecordings(await store.list())));
}

async function main() {
  const command = process.argv[2];
  if (!command || command === "--help" || command === "-h") {
    usage();
    return;
  }
  if (command === "proxy") return proxy();
  if (command === "inspect") return inspect();

  console.error(`Unknown command: ${command}`);
  usage();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
