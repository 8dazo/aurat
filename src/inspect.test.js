import assert from "node:assert/strict";
import test from "node:test";
import { summarizeRecordings } from "./inspect.js";

test("summarizeRecordings extracts endpoints models and tool calls from JSON and SSE", () => {
  const jsonResponse = {
    choices: [{ message: { tool_calls: [{ function: { name: "search_docs" } }] } }],
  };
  const sseResponse = 'data: {"choices":[{"delta":{"tool_calls":[{"function":{"name":"lookup_customer"}}]}}]}\n\ndata: [DONE]\n\n';
  const recordings = [
    {
      request: { method: "POST", path: "/v1/chat/completions", body: { model: "gpt-test" } },
      response: { body: Buffer.from(JSON.stringify(jsonResponse)).toString("base64"), bodyEncoding: "base64" },
    },
    {
      request: { method: "POST", path: "/v1/chat/completions", body: { model: "gpt-test", stream: true } },
      response: { body: Buffer.from(sseResponse).toString("base64"), bodyEncoding: "base64" },
    },
  ];

  assert.deepEqual(summarizeRecordings(recordings), {
    recordings: 2,
    endpoints: [["POST /v1/chat/completions", 2]],
    models: [["gpt-test", 2]],
    tools: [["lookup_customer", 1], ["search_docs", 1]],
  });
});
