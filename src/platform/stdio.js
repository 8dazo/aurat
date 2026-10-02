import { createInterface } from "node:readline";
import { handleMcp } from "./mcp.js";

// MCP clients launch this adapter; all data operations use the same authenticated API.
const base = new URL(process.env.AURAT_API_URL ?? "http://127.0.0.1:4318");
if (
  !["http:", "https:"].includes(base.protocol) ||
  base.username ||
  base.password ||
  base.pathname !== "/" ||
  base.search ||
  base.hash
)
  throw new Error("Invalid AURAT_API_URL");
const token = process.env.AURAT_WORKSPACE_TOKEN;
if (!token || token.length < 32)
  throw new Error("AURAT_WORKSPACE_TOKEN is required");
async function request(path, body) {
  const response = await fetch(new URL(path, base), {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "error",
    signal: AbortSignal.timeout(30000),
  });
  const value = await response.json();
  if (!response.ok) throw new Error("API request failed");
  return value;
}
const service = {
  store: {
    list: (kind) =>
      request(
        ["projects", "runs"].includes(kind) ? "/api/workspace" : `/api/${kind}`,
      ).then((v) =>
        kind === "projects" ? v.projects : kind === "runs" ? v.runs : v,
      ),
  },
  project: async (id) => {
    const value = (await request("/api/workspace")).projects.find(
      (p) => p.id === id,
    );
    if (!value) throw Error("Project not found");
    return value;
  },
  createContract: (args) => request("/api/contracts", args),
  verify: (args) => request("/api/verify", args),
};
// Sequential processing keeps initialization before subsequent tool requests.
for await (const line of createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
})) {
  if (Buffer.byteLength(line) > 1048576) {
    process.stdout.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32600, message: "Message too large" },
      }) + "\n",
    );
    continue;
  }
  let response;
  try {
    response = await handleMcp(service, JSON.parse(line));
  } catch {
    response = {
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "Parse error" },
    };
  }
  if (response) process.stdout.write(JSON.stringify(response) + "\n");
}
