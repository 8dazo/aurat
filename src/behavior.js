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
    for (const call of message?.tool_calls ?? []) {
      const name = call?.function?.name;
      if (typeof name === "string" && name) state.toolCalls.push(name);
    }

    const delta = choice?.delta;
    if (typeof delta?.content === "string") state.content.push(delta.content);
    for (const call of delta?.tool_calls ?? []) {
      const name = call?.function?.name;
      if (typeof name === "string" && name) state.toolCalls.push(name);
    }
  }
}

function collectResponse(text, streaming) {
  const state = { content: [], toolCalls: [], finishReasons: [] };

  if (streaming) {
    for (const line of text.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try { collectChoiceData(JSON.parse(payload), state); } catch { /* provider-specific event */ }
    }
  } else {
    try { collectChoiceData(JSON.parse(text), state); } catch { /* non-JSON response */ }
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

export function analyzeRecording(recording) {
  const contentType = responseContentType(recording);
  const streaming = recording.request.body?.stream === true || contentType === "text/event-stream";
  const collected = collectResponse(decodeBody(recording), streaming);
  const shape = contentShape(collected.content);
  const toolCalls = [...collected.toolCalls].sort();
  const finishReasons = [...new Set(collected.finishReasons)].sort();

  return {
    status: recording.response.status,
    contentType,
    streaming,
    kind: toolCalls.length > 0 ? "tool_calls" : shape.kind,
    toolCalls,
    finishReasons,
    jsonKeys: toolCalls.length > 0 ? [] : shape.jsonKeys,
  };
}
