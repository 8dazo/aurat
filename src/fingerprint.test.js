import assert from "node:assert/strict";
import test from "node:test";
import { fingerprintRequest } from "./fingerprint.js";

test("fingerprint is stable across object key order", () => {
  const first = fingerprintRequest({
    method: "POST",
    path: "/v1/chat/completions",
    body: { model: "gpt-test", messages: [{ role: "user", content: "hello" }], temperature: 0 },
  });
  const second = fingerprintRequest({
    method: "post",
    path: "/v1/chat/completions",
    body: { temperature: 0, messages: [{ content: "hello", role: "user" }], model: "gpt-test" },
  });
  assert.equal(first, second);
});

test("stream_options does not affect fingerprint", () => {
  const base = { method: "POST", path: "/v1/chat/completions", body: { model: "gpt-test", messages: [] } };
  const withStreamOptions = { ...base, body: { ...base.body, stream_options: { include_usage: true } } };
  assert.equal(fingerprintRequest(base), fingerprintRequest(withStreamOptions));
});
