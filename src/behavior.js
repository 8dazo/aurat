import { inferSchema } from "./schema.js";

function decodeBody(recording) {
  if (recording.response.bodyEncoding === "base64") {
    return Buffer.from(recording.response.body ?? "", "base64").toString("utf8");
  }
  return recording.response.body ?? "";
}

function responseContentType(recording) {
  const headers = recording.response.headers ?? {};
  const entry = Object.entries(headers).find(([name]) => name.toLowerCase() === "content-type");
  return entry ? String(entry[1]).split(";", 1)[0].trim().toLowerCase() : "";
}

function collectChoiceData(value, state) {
  if (!value || typeof value !== "object") return;
  for (const choice of value.choices ?? []) {
    const finish = choice?.finish_reason;
    if (typeof finish === "string" && finish) state.finishReasons.push(finish);

    const message = choice?.message;
    if (typeof message?.content === "string") state.content.push(message.content);
    for (const [index, call] of (message?.tool_calls ?? []).entries()) {
      const name = call?.function?.name;
      if (typeof name === "string" && name) state.toolCalls.push(name);
      state.calls.set(`${choice.index ?? 0}:${index}`, { name: name ?? "", arguments: call?.function?.arguments ?? "{}" });
    }

    const delta = choice?.delta;
    if (typeof delta?.content === "string") state.content.push(delta.content);
    for (const [index, call] of (delta?.tool_calls ?? []).entries()) {
      const name = call?.function?.name;
      if (typeof name === "string" && name) state.toolCalls.push(name);
      const key = `${choice.index ?? 0}:${call.index ?? index}`;
      const prior = state.calls.get(key) ?? { name: "", arguments: "" };
      state.calls.set(key, { name: prior.name + (name ?? ""), arguments: prior.arguments + (call?.function?.arguments ?? "") });
    }
  }
}

function collectResponse(text, streaming) {
  const state = { content: [], toolCalls: [], finishReasons: [], calls: new Map(), malformed: false };

  if (streaming) {
    for (const line of text.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try { collectChoiceData(JSON.parse(payload), state); } catch { state.malformed = true; }
    }
  } else {
    try { collectChoiceData(JSON.parse(text), state); } catch { state.malformed = true; }
  }

  return state;
}

function contentShape(content) {
  const text = content.join("");
  if (!text.trim()) return { kind: "empty", jsonKeys: [] };

  try {
    const value = JSON.parse(text);
    const jsonKeys = value && typeof value === "object" && !Array.isArray(value)
      ? Object.keys(value).sort()
      : [];
    return { kind: "json", jsonKeys };
  } catch {
    return { kind: "text", jsonKeys: [] };
  }
}

export function analyzeRecording(recording, { detailed = false } = {}) {
  const contentType = responseContentType(recording);
  const streaming = recording.request.body?.stream === true || contentType === "text/event-stream";
  const collected = collectResponse(decodeBody(recording), streaming);
  const shape = contentShape(collected.content);
  const toolCalls = [...collected.toolCalls].sort();
  const finishReasons = [...new Set(collected.finishReasons)].sort();

  const result = {
    status: recording.response.status,
    contentType,
    streaming,
    kind: toolCalls.length > 0 ? "tool_calls" : shape.kind,
    toolCalls,
    finishReasons,
    jsonKeys: toolCalls.length > 0 ? [] : shape.jsonKeys,
  };
  if (detailed) {
    result.malformed = collected.malformed;
    result.toolDetails = [...collected.calls.values()].map((call) => {
      try { return { name: call.name, arguments: JSON.parse(call.arguments || "{}") }; }
      catch { return { name: call.name, invalidArguments: call.arguments }; }
    });
    if (shape.kind === "json") {
      result.jsonValue = JSON.parse(collected.content.join(""));
      result.jsonSchema = inferSchema(result.jsonValue);
    }
  }
  return result;
}
