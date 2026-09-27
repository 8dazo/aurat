import assert from "node:assert/strict";
import test from "node:test";
import { FAULT_NAMES, getFaultProfile } from "./faults.js";

test("built-in fault profiles are deterministic", () => {
  assert.ok(FAULT_NAMES.includes("rate-limit"));
  const first = getFaultProfile("rate-limit");
  const second = getFaultProfile("rate-limit");
  assert.deepEqual(first, second);
  assert.equal(first.status, 429);
  assert.equal(JSON.parse(first.body).error.type, "rate_limit_error");
});

test("unknown fault profiles fail loudly", () => {
  assert.throws(() => getFaultProfile("surprise"), /Unknown Aurat fault/);
});
