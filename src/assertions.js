import { isDeepStrictEqual } from "node:util";
import { schemaErrors } from "./schema.js";
import { redact } from "./redact.js";

export function checkExecution(expect, events) {
  const failures = [];
  const tools = events.filter((e) => e.type === "tool");
  const outputs = events.filter((e) => e.type === "output");
  const fail = (field, message) => failures.push({ field, message });
  if ("outputSchema" in expect || "outputEquals" in expect) {
    if (outputs.length !== 1) fail("output", `Expected exactly one reportOutput call; got ${outputs.length}`);
    else {
      if ("outputSchema" in expect) {
        for (const e of schemaErrors(expect.outputSchema, outputs[0].value)) fail(`output${e.path}`, `${e.message} ${JSON.stringify(e.params)}`);
      }
      if ("outputEquals" in expect && !isDeepStrictEqual(outputs[0].value, redact(expect.outputEquals))) fail("output", "Output differs from expected value");
    }
  }
  for (const rule of expect.tools ?? []) {
    const calls = tools.filter((e) => e.name === rule.name);
    const n = calls.length;
    if (rule.count !== undefined && n !== rule.count) fail(`tool.${rule.name}.count`, `Expected ${rule.count}; got ${n}`);
    if (rule.min !== undefined && n < rule.min) fail(`tool.${rule.name}.min`, `Expected at least ${rule.min}; got ${n}`);
    if (rule.max !== undefined && n > rule.max) fail(`tool.${rule.name}.max`, `Expected at most ${rule.max}; got ${n}`);
    if (rule.count === undefined && rule.min === undefined && rule.max === undefined && !n) fail(`tool.${rule.name}`, "Required tool was not called");
    for (const call of calls) {
      if ("arguments" in rule && !isDeepStrictEqual(call.args, redact(rule.arguments))) fail(`tool.${rule.name}.arguments`, "Arguments differ from expected value");
      if ("argumentsSchema" in rule) for (const e of schemaErrors(rule.argumentsSchema, call.args)) fail(`tool.${rule.name}${e.path}`, `${e.message} ${JSON.stringify(e.params)}`);
    }
  }
  const names = tools.map((e) => e.name);
  if (expect.toolOrder && !isDeepStrictEqual(names, expect.toolOrder)) fail("toolOrder", `Expected ${expect.toolOrder.join(" → ")}; got ${names.join(" → ")}`);
  for (const [first, second] of expect.before ?? []) {
    if (!names.includes(first) || !names.includes(second) || names.lastIndexOf(first) >= names.indexOf(second)) fail("before", `All ${first} calls must precede ${second}`);
  }
  return failures;
}
