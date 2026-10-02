import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { langfuseObservationToRecording } from "./langfuse.js";
import { fingerprintRequest } from "./fingerprint.js";
const sample = JSON.parse(
  readFileSync(
    new URL("../examples/langfuse/observations.json", import.meta.url),
  ),
).data[0];
const row = (changes = {}) => ({ ...structuredClone(sample), ...changes });
const decoded = (recording) =>
  JSON.parse(Buffer.from(recording.response.body, "base64"));

test("Langfuse v2 raw JSON I/O becomes deterministic captured chat evidence with tool calls and provenance", () => {
  const a = langfuseObservationToRecording(row()).recording;
  const b = langfuseObservationToRecording(row()).recording;
  assert.deepEqual(a, b);
  assert.equal(a.request.body.temperature, 0);
  assert.equal(a.request.body.stream, false);
  assert.deepEqual(a.request.body.messages, JSON.parse(sample.input));
  assert.equal(a.fingerprint, fingerprintRequest(a.request));
  assert.equal(a.metadata.traceId, "trace-1");
  assert.equal(a.metadata.spanId, "observation-1");
  assert.equal(a.createdAt, sample.startTime);
  assert.equal(
    decoded(a).choices[0].message.tool_calls[0].function.name,
    "search_docs",
  );
  assert.equal(decoded(a).choices[0].finish_reason, null);
});
test("full chat request and completion preserve supplied parameters, messages, choices and usage", () => {
  const input = {
    model: "requested-model",
    messages: [
      { role: "system", content: "Help" },
      JSON.parse(sample.output),
      { role: "tool", tool_call_id: "call-1", content: "Found it" },
      { role: "user", content: [{ type: "text", text: "Summarize" }] },
    ],
    max_tokens: 100,
    response_format: { type: "json_object" },
    tools: [
      {
        type: "function",
        function: { name: "search_docs", parameters: { type: "object" } },
      },
    ],
  };
  const output = {
    id: "completion-1",
    model: "response-model",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: "Done" },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 1 },
  };
  const { recording } = langfuseObservationToRecording(row({ input, output }));
  assert.equal(recording.request.body.model, "requested-model");
  assert.deepEqual(recording.request.body.tools, input.tools);
  assert.deepEqual(decoded(recording), {
    ...output,
    object: "chat.completion",
  });
});
test("normalization does not invent model outputs, flatten images, infer missing requests or synthesize streams", () => {
  const cases = [
    [{ type: "SPAN" }, "unsupported_observation_type"],
    [{ id: "" }, "missing_source_identity"],
    [{ level: "ERROR" }, "errored_generation"],
    [{ endTime: null }, "incomplete_generation"],
    [{ endTime: "2024-01-01T00:00:00Z" }, "incomplete_generation"],
    [
      { input: "a prompt without captured roles" },
      "unsupported_input_messages",
    ],
    [
      {
        input: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: "https://example.com/image.png" },
              },
            ],
          },
        ],
      },
      "unsupported_input_messages",
    ],
    [
      { input: [{ role: "unexpected", content: "text" }] },
      "unsupported_input_messages",
    ],
    [{ output: null }, "unsupported_output_messages"],
    [
      { output: { role: "assistant", content: null } },
      "unsupported_output_messages",
    ],
    [{ output: { content: "without a role" } }, "unsupported_output_messages"],
    [{ output: { choices: [] } }, "unsupported_output_messages"],
    [
      { output: { type: "response", output: [] } },
      "unsupported_output_messages",
    ],
    [{ model: null }, "missing_model"],
    [{ modelParameters: { stream: true } }, "unsupported_streaming"],
    [
      { modelParameters: { unknown_option: 1 } },
      "unsupported_model_parameters",
    ],
    [
      { input: { messages: JSON.parse(sample.input), unknown_option: 1 } },
      "unsupported_request_fields",
    ],
    [
      { modelParameters: { tools: [{ type: "web_search" }] } },
      "unsupported_tools",
    ],
    [{ output: "a".repeat(262144) }, "observation_too_large"],
  ];
  for (const [changes, expected] of cases)
    assert.equal(
      langfuseObservationToRecording(row(changes)).skip,
      expected,
      JSON.stringify(changes).slice(0, 150),
    );
});
test("plain captured text and refusal messages are retained without fabricated stop reasons", () => {
  const text = langfuseObservationToRecording(
    row({ output: "Here is the answer" }),
  ).recording;
  assert.equal(decoded(text).choices[0].message.content, "Here is the answer");
  assert.equal(decoded(text).choices[0].finish_reason, null);
  const refusal = langfuseObservationToRecording(
    row({
      output: { role: "assistant", content: null, refusal: "Cannot assist" },
    }),
  ).recording;
  assert.equal(decoded(refusal).choices[0].message.refusal, "Cannot assist");
});
test("redaction precedes fingerprints and base64, including JSON-encoded tool arguments", () => {
  const output = JSON.parse(sample.output);
  output.tool_calls[0].function.arguments = JSON.stringify({
    password: "private-password",
    api_key: "another-private-value",
  });
  const secret = "sk-lf-12345678901234567890";
  const { recording } = langfuseObservationToRecording(
    row({ input: [{ role: "user", content: secret }], output }),
  );
  const all = JSON.stringify(recording) + JSON.stringify(decoded(recording));
  for (const value of [secret, "private-password", "another-private-value"])
    assert.equal(all.includes(value), false);
  assert.match(
    decoded(recording).choices[0].message.tool_calls[0].function.arguments,
    /aurat-redacted/,
  );
  assert.equal(recording.fingerprint, fingerprintRequest(recording.request));
});
