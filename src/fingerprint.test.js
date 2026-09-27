import assert from "node:assert/strict";
import test from "node:test";
import { canonicalJson, fingerprintRequest } from "./fingerprint.js";

test("canonical JSON is stable across object key order", () => {
  assert.equal(canonicalJson({ b: 2, a: { d: 4, c: 3 } }), canonicalJson({ a: { c: 3, d: 4 }, b: 2 }));
});

test("fingerprints change when meaningful request data changes", () => {
  const base = { method: "POST", path: "/v1/chat/completions", body: { model: "gpt-test", messages: [{ role: "user", content: "one" }] } };
  const changed = { ...base, body: { ...base.body, messages: [{ role: "user", content: "two" }] } };
  assert.notEqual(fingerprintRequest(base), fingerprintRequest(changed));
});

test("stream_options remains ignored for SDK compatibility", () => {
  const base = { method: "POST", path: "/v1/chat/completions", body: { model: "gpt-test", stream: true } };
  const sdkVariant = { ...base, body: { ...base.body, stream_options: { include_usage: true } } };
  assert.equal(fingerprintRequest(base), fingerprintRequest(sdkVariant));
});

test("matching rules ignore configured nested fields", () => {
  const matching = { ignoreBodyPaths: ["metadata.request_id", "messages.*.id"] };
  const first = {
    method: "POST",
    path: "/v1/chat/completions",
    body: { metadata: { request_id: "req-1", tenant: "acme" }, messages: [{ id: "msg-1", role: "user", content: "hello" }] },
  };
  const second = {
    ...first,
    body: { metadata: { request_id: "req-2", tenant: "acme" }, messages: [{ id: "msg-2", role: "user", content: "hello" }] },
  };
  assert.equal(fingerprintRequest(first, matching), fingerprintRequest(second, matching));
  assert.notEqual(fingerprintRequest(first), fingerprintRequest(second));
});

test("matching rules can ignore volatile query parameters", () => {
  const first = { method: "GET", path: "/v1/models?tenant=acme&request_id=one", body: null };
  const second = { method: "GET", path: "/v1/models?tenant=acme&request_id=two", body: null };
  const matching = { ignoreQueryParams: ["request_id"] };
  assert.equal(fingerprintRequest(first, matching), fingerprintRequest(second, matching));
  assert.notEqual(fingerprintRequest(first), fingerprintRequest(second));
});
