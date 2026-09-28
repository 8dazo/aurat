import assert from "node:assert/strict";
import test from "node:test";
import { buildContract, verifyContract } from "./contracts.js";

function recording({ fingerprint = "scenario-1", body, response, headers = { "content-type": "application/json" } }) {
  return {
    version: 2,
    fingerprint,
    request: { method: "POST", path: "/v1/chat/completions", body },
    response: {
      status: 200,
      headers,
      body: Buffer.from(JSON.stringify(response)).toString("base64"),
      bodyEncoding: "base64",
    },
  };
}

test("buildContract captures tool-call behavior for each scenario", () => {
  const baseline = recording({
    body: { model: "gpt-test", messages: [] },
    response: {
      choices: [{ finish_reason: "tool_calls", message: { tool_calls: [{ function: { name: "search_docs" } }] } }],
    },
  });

  const contract = buildContract([baseline]);
  assert.equal(contract.version, 2);
  assert.equal(contract.scenarios.length, 1);
  assert.deepEqual(contract.scenarios[0].expected, {
    status: 200,
    contentType: "application/json",
    streaming: false,
    kind: "tool_calls",
    toolCalls: ["search_docs"],
    finishReasons: ["tool_calls"],
    jsonKeys: [],
    malformed: false,
    toolDetails: [{ name: "search_docs", arguments: {} }],
  });
});

test("verifyContract catches a tool-call regression", () => {
  const body = { model: "gpt-test", messages: [] };
  const baseline = recording({
    body,
    response: { choices: [{ finish_reason: "tool_calls", message: { tool_calls: [{ function: { name: "search_docs" } }] } }] },
  });
  const candidate = recording({
    body,
    response: { choices: [{ finish_reason: "stop", message: { content: "I cannot find that." } }] },
  });

  const result = verifyContract(buildContract([baseline]), [candidate]);
  assert.equal(result.ok, false);
  assert.equal(result.failed, 1);
  assert.ok(result.scenarios[0].failures.some((failure) => failure.field === "kind"));
  assert.ok(result.scenarios[0].failures.some((failure) => failure.field === "toolCalls"));
});

test("verifyContract catches structured JSON shape drift", () => {
  const body = { model: "gpt-test", messages: [] };
  const baseline = recording({
    body,
    response: { choices: [{ finish_reason: "stop", message: { content: '{"answer":"yes","confidence":0.9}' } }] },
  });
  const candidate = recording({
    body,
    response: { choices: [{ finish_reason: "stop", message: { content: '{"answer":"yes","source":"docs"}' } }] },
  });

  const result = verifyContract(buildContract([baseline]), [candidate]);
  assert.equal(result.ok, false);
  assert.deepEqual(result.scenarios[0].failures.find((failure) => failure.field === "jsonKeys"), {
    field: "jsonKeys",
    expected: ["answer", "confidence"],
    actual: ["answer", "source"],
  });
});
