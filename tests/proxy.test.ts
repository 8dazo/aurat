import http from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createAuratServer } from "../src/proxy.js";

const servers: http.Server[] = [];
const directories: string[] = [];

async function listen(server: http.Server): Promise<number> {
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing server address");
  return address.port;
}

async function close(server: http.Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  const index = servers.indexOf(server);
  if (index >= 0) servers.splice(index, 1);
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => server.close(() => resolve())),
    ),
  );
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("Aurat proxy", () => {
  it("records a provider response and replays it without another provider call", async () => {
    let providerCalls = 0;
    const provider = http.createServer(async (_request, response) => {
      providerCalls += 1;
      response.statusCode = 200;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ id: "chatcmpl_test", choices: [{ message: { role: "assistant", content: "hello" } }] }));
    });
    const providerPort = await listen(provider);

    const cassetteDir = await mkdtemp(path.join(tmpdir(), "aurat-test-"));
    directories.push(cassetteDir);

    const recorder = createAuratServer({
      mode: "record",
      upstreamUrl: `http://127.0.0.1:${providerPort}`,
      cassetteDir,
    });
    const recordPort = await listen(recorder);

    const requestBody = {
      model: "test-model",
      messages: [{ role: "user", content: "hello" }],
    };

    const recordedResponse = await fetch(`http://127.0.0.1:${recordPort}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    expect(recordedResponse.status).toBe(200);
    expect(recordedResponse.headers.get("x-aurat-mode")).toBe("record");
    expect(await recordedResponse.json()).toMatchObject({ id: "chatcmpl_test" });
    expect(providerCalls).toBe(1);

    await close(recorder);

    const replayer = createAuratServer({
      mode: "replay",
      upstreamUrl: `http://127.0.0.1:${providerPort}`,
      cassetteDir,
    });
    const replayPort = await listen(replayer);

    const replayedResponse = await fetch(`http://127.0.0.1:${replayPort}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: requestBody.messages, model: requestBody.model }),
    });

    expect(replayedResponse.status).toBe(200);
    expect(replayedResponse.headers.get("x-aurat-mode")).toBe("replay");
    expect(replayedResponse.headers.get("x-aurat-replay")).toBe("hit");
    expect(await replayedResponse.json()).toMatchObject({ id: "chatcmpl_test" });
    expect(providerCalls).toBe(1);
  });

  it("returns an actionable replay miss", async () => {
    const cassetteDir = await mkdtemp(path.join(tmpdir(), "aurat-test-"));
    directories.push(cassetteDir);

    const replayer = createAuratServer({
      mode: "replay",
      upstreamUrl: "https://api.openai.com",
      cassetteDir,
    });
    const replayPort = await listen(replayer);

    const response = await fetch(`http://127.0.0.1:${replayPort}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "test", messages: [] }),
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("x-aurat-replay")).toBe("miss");
    const body = await response.json() as { error: { type: string; fingerprint: string } };
    expect(body.error.type).toBe("aurat_replay_miss");
    expect(body.error.fingerprint).toHaveLength(64);
  });
});
