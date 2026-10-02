import { InputError, text } from "./service.js";

const projectSchema = {
  type: "object",
  properties: { projectId: { type: "string" } },
  required: ["projectId"],
  additionalProperties: false,
};
export const tools = [
  {
    name: "list_projects",
    description: "List projects in the configured private workspace",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "list_connections",
    description:
      "List real GitHub, OTLP and Langfuse connections; credentials are never returned",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "list_runs",
    description: "List stored verification results for a project",
    inputSchema: projectSchema,
    annotations: { readOnlyHint: true },
  },
  {
    name: "create_contract",
    description:
      "Infer a behavioral contract from already imported OTLP or Langfuse model generations",
    inputSchema: {
      ...projectSchema,
      properties: { ...projectSchema.properties, name: { type: "string" } },
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: "verify_contract",
    description:
      "Compare stored traces against a contract. Does not execute repository code or call a live model.",
    inputSchema: {
      ...projectSchema,
      properties: {
        ...projectSchema.properties,
        contractId: { type: "string" },
      },
      required: ["projectId", "contractId"],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
];
const versions = ["2025-11-25", "2025-06-18", "2025-03-26"];
export async function handleMcp(service, message) {
  const id = message?.id ?? null;
  const error = (code, message) => ({
    jsonrpc: "2.0",
    id,
    error: { code, message },
  });
  if (
    !message ||
    Array.isArray(message) ||
    message.jsonrpc !== "2.0" ||
    typeof message.method !== "string" ||
    (message.id !== undefined &&
      typeof message.id !== "string" &&
      typeof message.id !== "number")
  )
    return error(-32600, "Invalid request");
  if (message.id === undefined) return null;
  if (message.method === "initialize")
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: versions.includes(message.params?.protocolVersion)
          ? message.params.protocolVersion
          : versions[0],
        capabilities: { tools: {} },
        serverInfo: { name: "aurat", version: "0.3.0" },
      },
    };
  if (message.method === "ping") return { jsonrpc: "2.0", id, result: {} };
  if (message.method === "tools/list")
    return { jsonrpc: "2.0", id, result: { tools } };
  if (message.method !== "tools/call") return error(-32601, "Method not found");
  const name = message.params?.name;
  const spec = tools.find((t) => t.name === name);
  if (!spec) return error(-32602, "Unknown tool");
  const args = message.params?.arguments ?? {};
  if (
    !args ||
    Array.isArray(args) ||
    typeof args !== "object" ||
    Object.keys(args).some(
      (k) => !Object.hasOwn(spec.inputSchema.properties, k),
    )
  )
    return error(-32602, "Invalid tool arguments");
  try {
    for (const key of spec.inputSchema.required ?? []) text(args[key], key);
    if (args.name !== undefined) text(args.name, "name");
    let value;
    if (name === "list_projects") value = await service.store.list("projects");
    if (name === "list_connections")
      value = await service.store.list("connections");
    if (name === "list_runs") {
      await service.project(args.projectId);
      value = (await service.store.list("runs")).filter(
        (r) => r.projectId === args.projectId,
      );
    }
    if (name === "create_contract") value = await service.createContract(args);
    if (name === "verify_contract") value = await service.verify(args);
    return {
      jsonrpc: "2.0",
      id,
      result: {
        content: [{ type: "text", text: JSON.stringify(value) }],
        isError: false,
      },
    };
  } catch (e) {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        content: [
          {
            type: "text",
            text: e instanceof InputError ? e.message : "Tool execution failed",
          },
        ],
        isError: true,
      },
    };
  }
}
export { versions };
