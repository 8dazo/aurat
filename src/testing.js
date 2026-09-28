import { appendFileSync, readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { emitEvent } from "./events.js";
import { redact } from "./redact.js";

let fixtures;
let cursor = 0;
let recordingActive = false;

export function reportOutput(value) {
  if (value === undefined) throw new Error("reportOutput requires a JSON value");
  emitEvent({ type: "output", value });
  return value;
}

export function wrapTool(name, implementation) {
  if (typeof name !== "string" || !name || typeof implementation !== "function") throw new Error("wrapTool requires a name and implementation");
  return async function auratTool(args) {
    if (args === undefined) throw new Error(`Tool ${name} requires JSON arguments`);
    const safeArgs = redact(args);
    if (process.env.AURAT_MODE === "replay") {
      if (!process.env.AURAT_TOOLS_PATH || !process.env.AURAT_EVENTS_PATH) throw new Error("Tool replay requires aurat test");
      fixtures ??= JSON.parse(readFileSync(process.env.AURAT_TOOLS_PATH, "utf8"));
      const fixture = fixtures[cursor];
      const index = cursor++;
      const matched = Boolean(fixture && fixture.name === name && isDeepStrictEqual(redact(fixture.args), safeArgs));
      emitEvent({ type: "tool", name, args: safeArgs, index, matched, ...(fixture?.error ? { error: fixture.error } : {}) });
      if (!matched) throw new Error(`Aurat tool replay miss at call ${index + 1}: ${name}. Inspect the scenario fixture and arguments.`);
      if (fixture.error) throw new Error(fixture.error);
      return structuredClone(fixture.result);
    }
    if (process.env.AURAT_MODE !== "record") return implementation(args);
    const path = process.env.AURAT_TOOL_RECORDINGS_PATH;
    if (!path) throw new Error("Recording tools requires AURAT_TOOL_RECORDINGS_PATH");
    if (recordingActive) throw new Error("Tool capture currently requires sequential calls; await each tool before starting another");
    recordingActive = true;
    const entry = { name, args: safeArgs };
    try {
      const result = await implementation(args);
      if (result === undefined) throw new Error("Recorded tools must return a JSON value");
      entry.result = redact(result);
      return result;
    } catch (error) {
      entry.error = String(error.message ?? error);
      throw error;
    } finally {
      recordingActive = false;
      mkdirSync(dirname(path), { recursive: true });
      appendFileSync(path, `${JSON.stringify(redact(entry))}\n`, { mode: 0o600 });
    }
  };
}
