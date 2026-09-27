import assert from "node:assert/strict";
import test from "node:test";
import { analyzeRecording } from "./behavior.js";
import { collectOtlpSpans, convertOtlpDocument, decodeAttributes, otelSpanToRecording } from "./otel.js";

function attr(key, value) {
  if (typeof value === "string") return { key, value: { stringValue: value } };
  if (typeof value === "boolean") return { key, value: { boolValue: value } };
  if (typeof value === "number") return { key, value: { doubleValue: value } };
  throw new Error("fixture value must be primitive");
}

function genAiSpan(overrides = {}) {
  const input = [{ role: "user", parts: [{ type: "text", content: "Find the policy" }] }];
  const output = [{ role: "assistant", parts: [{ type: "tool_call", id: "call_1", name: "search_docs", arguments: { q: "policy" } }], finish_reason: "tool_calls" }];
  return {
    traceId: "trace-1",
    spanId: "span-1",
    attributes: [
      attr("gen_ai.operation.name", "chat"),
      attr("gen_ai.provider.name", "openai"),
      attr("gen_ai.request.model", "gpt-test"),
      attr("gen_ai.input.messages", JSON.stringify(input)),
      attr("gen_ai.output.messages", JSON.stringify(output)),
      attr("gen_ai.request.temperature", 0.2),
      ...overrides.attributes ?? [],
    ],
    ...overrides,
  };
}

test("decodeAttributes handles OTLP scalar, array, and kvlist values", () => {
  const decoded = decodeAttributes([
    { key: "name", value: { stringValue: "aurat" } },
    { key: "items", value: { arrayValue: { values: [{ stringValue: "a" }, { intValue: "2" }] } } },
    { key: "obj", value: { kvlistValue: { values: [{ key: "ok", value: { boolValue: true } }] } } },
  ]);
  assert.deepEqual(decoded, { name: "aurat", items: ["a", 2], obj: { ok: true } });
});

test("OTLP traversal finds spans in resource/scope envelopes", () => {
  const span = genAiSpan();
  assert.deepEqual(collectOtlpSpans({ resourceSpans: [{ scopeSpans: [{ spans: [span] }] }] }), [span]);
});

test("GenAI spans become replayable OpenAI-compatible recordings with tool behavior", () => {
  const result = otelSpanToRecording(genAiSpan());
  assert.ok(result.recording);
  assert.equal(result.recording.request.path, "/v1/chat/completions");
  assert.equal(result.recording.request.body.model, "gpt-test");
  assert.equal(result.recording.request.body.temperature, 0.2);
  assert.equal(result.recording.request.body.messages[0].content, "Find the policy");
  assert.deepEqual(analyzeRecording(result.recording), {
    status: 200,
    contentType: "application/json",
    streaming: false,
    kind: "tool_calls",
    toolCalls: ["search_docs"],
    finishReasons: ["tool_calls"],
    jsonKeys: [],
  });
});

test("streaming GenAI spans produce event-stream recordings understood by Aurat", () => {
  const span = genAiSpan({ attributes: [
    attr("gen_ai.operation.name", "chat"),
    attr("gen_ai.request.model", "gpt-test"),
    attr("gen_ai.input.messages", JSON.stringify([{ role: "user", parts: [{ type: "text", content: "Hi" }] }])),
    attr("gen_ai.output.messages", JSON.stringify([{ role: "assistant", parts: [{ type: "text", content: "Hello" }], finish_reason: "stop" }])),
    attr("gen_ai.request.stream", true),
  ] });
  const { recording } = otelSpanToRecording(span);
  assert.equal(recording.response.headers["content-type"], "text/event-stream");
  const behavior = analyzeRecording(recording);
  assert.equal(behavior.streaming, true);
  assert.equal(behavior.kind, "text");
  assert.deepEqual(behavior.finishReasons, ["stop"]);
});

test("converter reports spans that cannot be replayed because message content was not captured", () => {
  const missingContent = {
    traceId: "trace-2",
    spanId: "span-2",
    attributes: [attr("gen_ai.operation.name", "chat"), attr("gen_ai.request.model", "gpt-test")],
  };
  const converted = convertOtlpDocument({ spans: [genAiSpan(), missingContent] });
  assert.equal(converted.scanned, 2);
  assert.equal(converted.imported, 1);
  assert.deepEqual(converted.skipped, { missing_message_content: 1 });
});
