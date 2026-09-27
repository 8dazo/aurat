import { describe, expect, it } from "vitest";
import { createRequestFingerprint } from "../src/fingerprint.js";

describe("createRequestFingerprint", () => {
  it("is stable across JSON object key order", () => {
    const first = createRequestFingerprint(
      "POST",
      "/v1/chat/completions",
      Buffer.from(JSON.stringify({ model: "gpt-4o-mini", temperature: 0, messages: [{ role: "user", content: "hi" }] })),
    );

    const second = createRequestFingerprint(
      "post",
      "/v1/chat/completions",
      Buffer.from(JSON.stringify({ messages: [{ content: "hi", role: "user" }], temperature: 0, model: "gpt-4o-mini" })),
    );

    expect(first).toBe(second);
  });

  it("changes when the prompt changes", () => {
    const first = createRequestFingerprint("POST", "/v1/chat/completions", Buffer.from('{"prompt":"one"}'));
    const second = createRequestFingerprint("POST", "/v1/chat/completions", Buffer.from('{"prompt":"two"}'));
    expect(first).not.toBe(second);
  });
});
