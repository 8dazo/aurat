import { readFile } from "node:fs/promises";
import { ajv } from "./schema.js";

const jsonSchema = { anyOf: [{ type: "object" }, { type: "boolean" }] };
const toolFixture = { type: "object", required: ["name", "args"], additionalProperties: false,
  properties: { name: { type: "string", minLength: 1 }, args: {}, result: {}, error: { type: "string", minLength: 1 } },
  oneOf: [{ properties: { result: {} }, required: ["result"] }, { properties: { error: {} }, required: ["error"] }] };
const toolAssertion = { type: "object", required: ["name"], additionalProperties: false,
  properties: { name: { type: "string", minLength: 1 }, count: { type: "integer", minimum: 0 }, min: { type: "integer", minimum: 0 }, max: { type: "integer", minimum: 0 }, argumentsSchema: jsonSchema, arguments: {} } };
const schema = { type: "object", required: ["version", "scenarios"], additionalProperties: false, properties: {
  version: { const: 1 },
  scenarios: { type: "array", minItems: 1, items: { type: "object", required: ["id", "command", "expect"], additionalProperties: false, properties: {
    id: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$" },
    command: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
    cwd: { type: "string" }, recordings: { type: "string" }, config: { type: "string" }, tools: { anyOf: [{ type: "string" }, { type: "array", items: toolFixture }] },
    timeoutMs: { type: "integer", minimum: 100, maximum: 600000 },
    expect: { type: "object", minProperties: 1, additionalProperties: false, properties: {
      outputSchema: jsonSchema, outputEquals: {}, tools: { type: "array", minItems: 1, items: toolAssertion },
      toolOrder: { type: "array", minItems: 1, items: { type: "string" } },
      before: { type: "array", minItems: 1, items: { type: "array", minItems: 2, maxItems: 2, items: { type: "string" } } },
    } },
  } } },
} };
const validate = ajv.compile(schema);
const validateTools = ajv.compile({ type: "array", items: toolFixture });
export function validateSuite(suite) {
  if (!validate(suite)) throw new Error(`Invalid suite: ${ajv.errorsText(validate.errors)}`);
  const ids = suite.scenarios.map((s) => s.id);
  if (new Set(ids).size !== ids.length) throw new Error("Scenario IDs must be unique");
  for (const scenario of suite.scenarios) {
    if (scenario.expect.outputSchema !== undefined) ajv.compile(scenario.expect.outputSchema);
    for (const rule of scenario.expect.tools ?? []) {
      if (rule.argumentsSchema !== undefined) ajv.compile(rule.argumentsSchema);
      if (rule.min !== undefined && rule.max !== undefined && rule.min > rule.max) throw new Error(`Invalid tool bounds in ${scenario.id}`);
    }
  }
  return suite;
}
export async function readSuite(path) { return validateSuite(JSON.parse(await readFile(path, "utf8"))); }
export function validateToolFixtures(fixtures) {
  if (!validateTools(fixtures)) throw new Error(`Invalid tool fixtures: ${ajv.errorsText(validateTools.errors)}`);
  return fixtures;
}
