import assert from "node:assert/strict";
import test from "node:test";
import { analyzeRecording } from "./behavior.js";

test("analyzeRecording understands streaming tool calls", () => {
  const sse = [
    'data: {"choices":[{"delta":{"tool_calls":[{"function":{"name":"lookup_customer"}}]}}]}',
    'data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}',
    "data: [DONE]",
    "",
  ].join("\n\n");
  const result = analyzeRecording({
    request: { body: { stream: true } },
    response: {
      status: 200,
      headers: { "content-type": "text/event-stream; charset=utf-8" },
      body: Buffer.from(sse).toString("base64"),
      bodyEncoding: "base64",
    },
  });

  assert.deepEqual(result, {
    status: 200,
    contentType: "text/event-stream",
    streaming: true,
    kind: "tool_calls",
    toolCalls: ["lookup_customer"],
    finishReasons: ["tool_calls"],
    jsonKeys: [],
  });
});
