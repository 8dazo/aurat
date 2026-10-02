import Ajv from "ajv";
import { InputError } from "./service.js";
import { redact } from "../redact.js";
const count = { type: "integer", minimum: 0, maximum: 1000000 };
const schema = {
  type: "object",
  required: ["version", "lane", "revision", "createdAt", "ok", "scenarios"],
  additionalProperties: false,
  properties: {
    version: { const: 1 },
    lane: { const: "offline-application" },
    revision: { type: ["string", "null"], maxLength: 100 },
    createdAt: { type: "string", maxLength: 40 },
    ok: { type: "boolean" },
    scenarios: {
      type: "array",
      minItems: 1,
      maxItems: 200,
      items: {
        type: "object",
        required: ["id", "status", "durationMs", "failures"],
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1, maxLength: 150 },
          status: { enum: ["PASS", "FAIL", "INCOMPLETE", "INFRA_ERROR"] },
          durationMs: { type: "number", minimum: 0, maximum: 86400000 },
          failures: {
            type: "array",
            maxItems: 500,
            items: {
              type: "object",
              required: ["field", "message"],
              additionalProperties: false,
              properties: {
                field: { type: "string", maxLength: 500 },
                message: { type: "string", maxLength: 20000 },
              },
            },
          },
          events: { type: "array", maxItems: 5000, items: { type: "object" } },
          process: {
            type: "object",
            additionalProperties: false,
            properties: {
              stdout: { type: "string", maxLength: 20000 },
              stderr: { type: "string", maxLength: 20000 },
              exitCode: { type: ["integer", "null"] },
            },
          },
          coverage: {
            type: "object",
            required: ["model", "tools", "httpGuard", "osSandbox"],
            additionalProperties: false,
            properties: {
              httpGuard: { type: "boolean" },
              osSandbox: { type: "boolean" },
              model: {
                type: "object",
                required: ["total", "consumed", "pending"],
                additionalProperties: false,
                properties: {
                  total: count,
                  consumed: count,
                  pending: {
                    type: "array",
                    maxItems: 10000,
                    items: { type: "string", maxLength: 500 },
                  },
                },
              },
              tools: {
                type: "object",
                required: ["total", "consumed"],
                additionalProperties: false,
                properties: { total: count, consumed: count },
              },
            },
          },
        },
      },
    },
  },
};
const validate = new Ajv({ allowUnionTypes: true }).compile(schema);
export function parseReport(report) {
  if (!validate(report))
    throw new InputError("Invalid Aurat v1 application report");
  if (
    !/^\d{4}-\d\d-\d\dT/.test(report.createdAt) ||
    Number.isNaN(Date.parse(report.createdAt))
  )
    throw new InputError("Invalid report timestamp");
  if (
    report.ok !== report.scenarios.every((s) => s.status === "PASS") ||
    new Set(report.scenarios.map((s) => s.id)).size !== report.scenarios.length
  )
    throw new InputError("Inconsistent report result or duplicate scenarios");
  for (const s of report.scenarios) {
    if (s.status === "PASS" && s.failures.length)
      throw new InputError("Passing scenario contains failures");
    if (
      s.coverage &&
      (s.coverage.model.consumed > s.coverage.model.total ||
        s.coverage.tools.consumed > s.coverage.tools.total)
    )
      throw new InputError("Invalid coverage");
  }
  return redact(report);
}
