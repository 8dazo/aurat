import assert from "node:assert/strict";
import test from "node:test";
import { summarizeRecordings } from "./inspect.js";

test("summarizeRecordings extracts endpoints models and tool calls", () => {
  const response = {
    choices: [{ message: { tool_calls: [{ function: { name: "search_docs" } }] } }],
  };
  const recordings = [{
    request: { method: "POST", path: "/v1/chat/completions", body: { model: "gpt-test" } },
    response: { body: Buffer.from(JSON.stringify(response)).toString("base64"), bodyEncoding: "base64" },
  }];

  assert.deepEqual(summarizeRecordings(recordings), {
    recordings: 1,
    endpoints: [["POST /v1/chat/completions", 1]],
    models: [["gpt-test", 1]],
    tools: [["search_docs", 1]],
  });
});
