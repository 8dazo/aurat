import { appendFileSync, statSync } from "node:fs";
import { redact } from "./redact.js";

export function emitEvent(event) {
  const path = process.env.AURAT_EVENTS_PATH;
  if (!path) return;
  const line = JSON.stringify(redact(event));
  if (Buffer.byteLength(line) > 1024 * 1024 || statSync(path).size > 8 * 1024 * 1024) {
    throw new Error("Aurat event limit exceeded");
  }
  appendFileSync(path, `${line}\n`, { mode: 0o600 });
}
