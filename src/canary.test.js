import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { runCanary } from "./canary.js";
import { buildContract } from "./contracts.js";

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server.address().port;
}

async function close(server) {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

function recording({ fingerprint, path = "/v1/chat/completions", body, response }) {
  return {
    version: 2,
    fingerprint,
    request: { method: "POST", path, body },
    response: {
      status: 200,
      headers: { "content-type": "application/json" },
      body: Buffer.from(JSON.stringify(response)).toString("base64"),
      bodyEncoding: "base64",
    },
  };
}

function toolResponse(name = "search_docs") {
  return {
    choices: [{
      finish_reason: "tool_calls",
      message: { tool_calls: [{ function: { name } }] },
    }],
  };
}

test("live canary passes against matching provider behavior and forwards auth", async () => {
  const baseline = recording({
    fingerprint: "scenario-1",
    path: "/v1/chat/completions?tenant=acme",
    body: { model: "gpt-test", messages: [{ role: "user", content: "find docs" }] },
    response: toolResponse(),
  });
  let calls = 0;
  let seenAuth;
  let seenPath;
  let seenBody;
  const upstream = http.createServer(async (req, res) => {
    calls += 1;
    seenAuth = req.headers.authorization;
    seenPath = req.url;
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    seenBody = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(toolResponse()));
  });
  const port = await listen(upstream);

  try {
    const result = await runCanary({
      contract: buildContract([baseline]),
      recordings: [baseline],
      upstreamBaseUrl: `http://127.0.0.1:${port}/api`,
      upstreamApiKey: "provider-key",
      limit: 10,
    });
    assert.equal(result.selected, 1);
    assert.equal(result.verification.ok, true);
    assert.equal(calls, 1);
    assert.equal(seenAuth, "Bearer provider-key");
    assert.equal(seenPath, "/api/v1/chat/completions?tenant=acme");
    assert.deepEqual(seenBody, baseline.request.body);
  } finally {
    await close(upstream);
  }
});

test("live canary catches model behavior drift", async () => {
  const baseline = recording({
    fingerprint: "scenario-1",
    body: { model: "gpt-test", messages: [] },
    response: toolResponse(),
  });
  const upstream = http.createServer((_req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({
      choices: [{ finish_reason: "stop", message: { content: "No tool needed." } }],
    }));
  });
  const port = await listen(upstream);

  try {
    const result = await runCanary({
      contract: buildContract([baseline]),
      recordings: [baseline],
      upstreamBaseUrl: `http://127.0.0.1:${port}`,
      limit: 1,
    });
    assert.equal(result.verification.ok, false);
    const fields = result.verification.scenarios[0].failures.map((failure) => failure.field);
    assert.ok(fields.includes("kind"));
    assert.ok(fields.includes("toolCalls"));
    assert.ok(fields.includes("finishReasons"));
  } finally {
    await close(upstream);
  }
});

test("live canary deterministically caps provider calls", async () => {
  const first = recording({
    fingerprint: "a-scenario",
    body: { model: "gpt-test", messages: [{ role: "user", content: "a" }] },
    response: toolResponse(),
  });
  const second = recording({
    fingerprint: "b-scenario",
    body: { model: "gpt-test", messages: [{ role: "user", content: "b" }] },
    response: toolResponse(),
  });
  let calls = 0;
  const upstream = http.createServer((_req, res) => {
    calls += 1;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(toolResponse()));
  });
  const port = await listen(upstream);

  try {
    const result = await runCanary({
      contract: buildContract([second, first]),
      recordings: [second, first],
      upstreamBaseUrl: `http://127.0.0.1:${port}`,
      limit: 1,
    });
    assert.equal(result.total, 2);
    assert.equal(result.selected, 1);
    assert.equal(calls, 1);
    assert.equal(result.verification.scenarios[0].fingerprint, "a-scenario");
  } finally {
    await close(upstream);
  }
});

test("live canary reports network failures as contract failures", async () => {
  const baseline = recording({
    fingerprint: "scenario-1",
    body: { model: "gpt-test", messages: [] },
    response: toolResponse(),
  });
  const result = await runCanary({
    contract: buildContract([baseline]),
    recordings: [baseline],
    upstreamBaseUrl: "http://127.0.0.1:1",
    limit: 1,
  });
  assert.equal(result.verification.ok, false);
  assert.equal(result.verification.scenarios[0].failures[0].field, "live_call");
});
