import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { WorkspaceStore } from "./storage.js";
import { PlatformService } from "./service.js";
import { handler } from "./http.js";
import { handleMcp } from "./mcp.js";
const fixture = JSON.parse(
  readFileSync(
    new URL("../../examples/langfuse/observations.json", import.meta.url),
  ),
);
const window = {
  fromStartTime: "2025-01-01T00:00:00.000Z",
  toStartTime: "2025-01-02T00:00:00.000Z",
};
const token = "langfuse-test-workspace-token-32-characters";
const env = {
  AURAT_LANGFUSE_BASE_URL: "https://cloud.langfuse.com",
  AURAT_LANGFUSE_PUBLIC_KEY: "pk-lf-not-a-real-key",
  AURAT_LANGFUSE_SECRET_KEY: "sk-lf-not-a-real-secret",
};
const remote = { data: [{ id: "langfuse-project-1", name: "Test project" }] };
async function setup(t, store = new WorkspaceStore(":memory:")) {
  const state = {
    page: structuredClone(fixture),
    remote: structuredClone(remote),
    calls: [],
    fail: null,
  };
  const service = new PlatformService(store, {
    env: { ...env },
    fetchImpl: async (url, options) => {
      state.calls.push({ url, options });
      assert.equal(new URL(url).origin, "https://cloud.langfuse.com");
      assert.equal(options.method, "GET");
      assert.equal(options.redirect, "error");
      assert.ok(options.signal);
      assert.equal(
        options.headers.Authorization,
        "Basic " +
          Buffer.from(
            `${env.AURAT_LANGFUSE_PUBLIC_KEY}:${env.AURAT_LANGFUSE_SECRET_KEY}`,
          ).toString("base64"),
      );
      if (state.fail) return state.fail();
      return Response.json(
        new URL(url).pathname === "/api/public/projects"
          ? state.remote
          : state.page,
      );
    },
  });
  const server = createServer(handler(service, { token }));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await store.close();
  });
  const base = "http://127.0.0.1:" + server.address().port;
  const call = async (path, body, auth = token) => {
    const response = await fetch(base + path, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + auth,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, value: await response.json() };
  };
  const project = await service.createProject({
    name: "Agent",
    repository: "https://github.com/8dazo/aurat",
  });
  const connect = () =>
    call("/api/connections", { projectId: project.id, type: "langfuse" });
  return { store, service, state, call, project, connect };
}
test("authenticated Langfuse import paginates, deduplicates and drives contracts and changed-tool failures", async (t) => {
  const c = await setup(t);
  assert.equal(
    (
      await c.call(
        "/api/connections",
        { projectId: c.project.id, type: "langfuse" },
        "wrong",
      )
    ).status,
    401,
  );
  assert.equal(c.state.calls.length, 0);
  const connection = await c.connect();
  assert.equal(connection.status, 201);
  assert.equal(connection.value.metadata.remoteProjectId, remote.data[0].id);
  assert.equal((await c.connect()).status, 409);
  const path = `/api/connections/${connection.value.id}/sync`;
  c.state.page.meta.cursor = "next/opaque+cursor=";
  const first = await c.call(path, window);
  assert.equal(first.status, 200);
  assert.deepEqual(first.value, {
    scanned: 1,
    imported: 1,
    duplicates: 0,
    skipped: {},
    nextCursor: c.state.page.meta.cursor,
    complete: false,
  });
  const query = new URL(c.state.calls.at(-1).url).searchParams;
  assert.equal(query.get("fields"), "core,basic,io,model");
  assert.equal(query.get("limit"), "50");
  assert.equal(query.get("fromStartTime"), window.fromStartTime);
  assert.equal(query.get("toStartTime"), window.toStartTime);
  assert.equal(query.get("type"), "GENERATION");
  const contract = await c.service.createContract({ projectId: c.project.id });
  assert.equal(
    (
      await c.service.verify({
        projectId: c.project.id,
        contractId: contract.id,
      })
    ).report.ok,
    true,
  );
  assert.equal((await c.call(path, window)).value.duplicates, 1);
  const newer = structuredClone(fixture.data[0]);
  newer.id = "observation-2";
  newer.startTime = "2025-01-01T13:00:00Z";
  newer.endTime = "2025-01-01T13:00:01Z";
  newer.output = newer.output.replace("search_docs", "delete_docs");
  c.state.page = { data: [newer], meta: { cursor: null } };
  const second = await c.call(path, {
    ...window,
    cursor: first.value.nextCursor,
  });
  assert.equal(second.value.imported, 1);
  assert.equal(second.value.complete, true);
  assert.equal(
    new URL(c.state.calls.at(-1).url).searchParams.get("cursor"),
    first.value.nextCursor,
  );
  assert.equal(
    (
      await c.service.verify({
        projectId: c.project.id,
        contractId: contract.id,
      })
    ).report.ok,
    false,
  );
  // Older evidence arrives last, as it does with newest-first pagination. It must
  // not overwrite the newer behavior merely because it was imported afterward.
  const older = structuredClone(fixture.data[0]);
  older.id = "observation-0";
  older.startTime = "2025-01-01T11:00:00Z";
  older.endTime = "2025-01-01T11:00:01Z";
  c.state.page.data = [older];
  await c.call(path, window);
  assert.equal(
    (
      await c.service.verify({
        projectId: c.project.id,
        contractId: contract.id,
      })
    ).report.ok,
    false,
  );
  const connections = (await c.call("/api/connections")).value;
  assert.equal(connections[0].lastImport.scanned, 1);
  assert.ok(connections[0].lastSyncedAt);
  const mcp = await handleMcp(c.service, {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: "list_connections", arguments: {} },
  });
  assert.match(JSON.stringify(mcp), /langfuse/);
  const persisted =
    JSON.stringify(connections) +
    JSON.stringify(await c.store.list("batches")) +
    JSON.stringify(mcp);
  assert.equal(persisted.includes(env.AURAT_LANGFUSE_SECRET_KEY), false);
  assert.equal(persisted.includes(env.AURAT_LANGFUSE_PUBLIC_KEY), false);
});
test("concurrent retries save one immutable observation; changed content is surfaced, not overwritten", async (t) => {
  const c = await setup(t),
    connection = (await c.connect()).value;
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      c.service.syncConnection(connection.id, window),
    ),
  );
  assert.equal(
    results.reduce((n, r) => n + r.imported, 0),
    1,
  );
  assert.equal((await c.store.list("batches")).length, 1);
  c.state.page.data[0].output = "Changed after the first import";
  const result = await c.service.syncConnection(connection.id, window);
  assert.equal(result.skipped.changed_observation, 1);
  assert.equal((await c.store.list("batches")).length, 1);
});
test("concurrent connection verification creates one connector", async (t) => {
  const c = await setup(t);
  const results = await Promise.all(
    Array.from({ length: 8 }, () => c.connect()),
  );
  assert.equal(results.filter((r) => r.status === 201).length, 1);
  assert.equal(results.filter((r) => r.status === 409).length, 7);
  assert.equal((await c.store.list("connections")).length, 1);
});
test("a partial database failure can be retried without duplicate evidence or a prematurely advanced cursor", async (t) => {
  const c = await setup(t),
    connection = (await c.connect()).value;
  c.state.page.data.push({
    ...structuredClone(fixture.data[0]),
    id: "observation-2",
  });
  const path = `/api/connections/${connection.id}/sync`;
  const insert = c.store.putIfAbsent.bind(c.store);
  let writes = 0;
  c.store.putIfAbsent = async (...args) => {
    if (++writes === 2) throw Error("simulated storage outage");
    return insert(...args);
  };
  const failed = await c.call(path, window);
  assert.equal(failed.status, 500);
  assert.equal(failed.value.nextCursor, undefined);
  assert.equal((await c.store.list("batches")).length, 1);
  assert.equal(
    (await c.store.get("connections", connection.id)).lastImport,
    undefined,
  );
  c.store.putIfAbsent = insert;
  const retry = await c.call(path, window);
  assert.equal(retry.status, 200);
  assert.equal(retry.value.imported, 1);
  assert.equal(retry.value.duplicates, 1);
  assert.equal(retry.value.complete, true);
  assert.equal((await c.store.list("batches")).length, 2);
});
test("empty and unsupported pages are honest and incomplete generations can be imported later", async (t) => {
  const c = await setup(t),
    connection = (await c.connect()).value;
  c.state.page.data[0].endTime = null;
  const incomplete = await c.service.syncConnection(connection.id, window);
  assert.deepEqual(incomplete.skipped, { incomplete_generation: 1 });
  assert.equal((await c.store.list("batches")).length, 0);
  c.state.page = structuredClone(fixture);
  assert.equal(
    (await c.service.syncConnection(connection.id, window)).imported,
    1,
  );
  c.state.page.data = [];
  const empty = await c.service.syncConnection(connection.id, window);
  assert.equal(empty.scanned, 0);
  assert.equal(empty.complete, true);
});
test("regional hosts, credentials, project identity and input windows are enforced before importing", async (t) => {
  const c = await setup(t);
  for (const base of [
    "http://cloud.langfuse.com",
    "https://127.0.0.1",
    "https://cloud.langfuse.com.evil.test",
    "https://cloud.langfuse.com/path",
    "https://user:secret@cloud.langfuse.com",
    "https://cloud.langfuse.com?url=private",
  ]) {
    c.service.env.AURAT_LANGFUSE_BASE_URL = base;
    assert.equal((await c.connect()).status, 503);
  }
  assert.equal(c.state.calls.length, 0);
  c.service.env.AURAT_LANGFUSE_BASE_URL = env.AURAT_LANGFUSE_BASE_URL;
  delete c.service.env.AURAT_LANGFUSE_SECRET_KEY;
  assert.equal((await c.connect()).status, 503);
  c.service.env.AURAT_LANGFUSE_SECRET_KEY = env.AURAT_LANGFUSE_SECRET_KEY;
  assert.equal(
    (
      await c.call("/api/connections", {
        projectId: c.project.id,
        type: "langfuse",
        secretKey: "client-secret",
      })
    ).status,
    400,
  );
  const connection = (await c.connect()).value,
    path = `/api/connections/${connection.id}/sync`;
  const calls = c.state.calls.length;
  for (const bad of [
    {},
    { ...window, cursor: "" },
    { ...window, fromStartTime: window.toStartTime },
    { ...window, toStartTime: "2025-01-20T00:00:00Z" },
    { ...window, fromStartTime: "no timezone" },
    { ...window, url: "https://evil.test" },
  ])
    assert.equal((await c.call(path, bad)).status, 400);
  assert.equal(c.state.calls.length, calls);
  c.state.remote.data[0].id = "other-project";
  assert.equal((await c.call(path, window)).status, 409);
  c.state.remote = structuredClone(remote);
  for (const mismatch of [
    { projectId: "other-project" },
    { traceId: "bad/id" },
    { startTime: window.toStartTime },
    { startTime: "invalid" },
  ]) {
    c.state.page.data = [fixture.data[0], { ...fixture.data[0], ...mismatch }];
    assert.equal((await c.call(path, window)).status, 502);
    assert.equal((await c.store.list("batches")).length, 0);
  }
});
test("upstream failures are sanitized, bounded and safe to retry without advancing evidence", async (t) => {
  const c = await setup(t),
    connection = (await c.connect()).value;
  const path = `/api/connections/${connection.id}/sync`;
  for (const status of [401, 403, 429, 500]) {
    c.state.fail = () =>
      new Response(env.AURAT_LANGFUSE_SECRET_KEY, { status });
    const response = await c.call(path, window);
    assert.equal(response.status, status === 429 ? 429 : 502);
    assert.equal(
      JSON.stringify(response.value).includes(env.AURAT_LANGFUSE_SECRET_KEY),
      false,
    );
  }
  for (const fail of [
    () => {
      throw Error(env.AURAT_LANGFUSE_SECRET_KEY);
    },
    () => new Response("invalid json"),
    () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.error(Error("private-upstream-error"));
          },
        }),
      ),
    () => new Response("x", { headers: { "Content-Length": "5000000" } }),
    () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(4 * 1024 * 1024 + 1));
            controller.close();
          },
        }),
      ),
  ]) {
    c.state.fail = fail;
    const result = await c.call(path, window);
    assert.equal(result.status, 502);
    assert.equal(
      JSON.stringify(result.value).includes(env.AURAT_LANGFUSE_SECRET_KEY),
      false,
    );
  }
  c.state.fail = null;
  for (const page of [
    { data: fixture.data },
    { data: Array(51).fill(fixture.data[0]), meta: {} },
    { data: [], meta: { cursor: "next" } },
    { data: fixture.data, meta: { cursor: 4 } },
  ]) {
    c.state.page = page;
    assert.equal((await c.call(path, window)).status, 502);
  }
  c.state.page = { data: fixture.data, meta: { cursor: "same" } };
  assert.equal((await c.call(path, { ...window, cursor: "same" })).status, 502);
  assert.equal((await c.store.list("batches")).length, 0);
  c.state.page = structuredClone(fixture);
  assert.equal((await c.call(path, window)).value.imported, 1);
});
