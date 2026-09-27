#!/usr/bin/env node

import { parseArgs } from "node:util";
import { createAuratServer } from "./proxy.js";
import type { AuratMode } from "./types.js";

const VALID_MODES = new Set<AuratMode>(["live", "record", "replay"]);

function usage(): never {
  console.log(`Aurat.ai — deterministic CI runtime for AI applications

Usage:
  aurat serve [options]

Options:
  --mode, -m       live | record | replay  (default: record)
  --port, -p       local port              (default: 8787)
  --upstream, -u   upstream API origin     (default: https://api.openai.com)
  --dir, -d        cassette root directory (default: .aurat)
  --key, -k        upstream provider API key
  --help, -h       show this help

Environment variables:
  AURAT_MODE
  AURAT_PORT
  AURAT_UPSTREAM_URL
  AURAT_CASSETTE_DIR
  AURAT_UPSTREAM_API_KEY
  OPENAI_API_KEY
`);
  process.exit(0);
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    mode: { type: "string", short: "m" },
    port: { type: "string", short: "p" },
    upstream: { type: "string", short: "u" },
    dir: { type: "string", short: "d" },
    key: { type: "string", short: "k" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help) usage();

const command = positionals[0] ?? "serve";
if (command !== "serve") {
  console.error(`Unknown command: ${command}`);
  usage();
}

const rawMode = values.mode ?? process.env.AURAT_MODE ?? "record";
if (!VALID_MODES.has(rawMode as AuratMode)) {
  throw new Error(`Invalid AURAT mode: ${rawMode}`);
}

const mode = rawMode as AuratMode;
const port = Number(values.port ?? process.env.AURAT_PORT ?? "8787");
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  throw new Error(`Invalid port: ${port}`);
}

const upstreamUrl =
  values.upstream ?? process.env.AURAT_UPSTREAM_URL ?? "https://api.openai.com";
const cassetteDir = values.dir ?? process.env.AURAT_CASSETTE_DIR ?? ".aurat";
const upstreamApiKey =
  values.key ??
  process.env.AURAT_UPSTREAM_API_KEY ??
  process.env.OPENAI_API_KEY ??
  undefined;

const server = createAuratServer({
  mode,
  upstreamUrl,
  cassetteDir,
  upstreamApiKey,
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Aurat listening on http://127.0.0.1:${port}`);
  console.log(`mode=${mode} upstream=${upstreamUrl} cassettes=${cassetteDir}`);
});
