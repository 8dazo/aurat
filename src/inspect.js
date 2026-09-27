function extractToolCallsFromJson(value) {
  const tools = [];
  for (const choice of value?.choices ?? []) {
    for (const call of choice?.message?.tool_calls ?? []) {
      const name = call?.function?.name;
      if (typeof name === "string" && name) tools.push(name);
    }
    for (const call of choice?.delta?.tool_calls ?? []) {
      const name = call?.function?.name;
      if (typeof name === "string" && name) tools.push(name);
    }
  }
  return tools;
}

function decodeResponse(recording) {
  if (recording.response.bodyEncoding === "base64") {
    return Buffer.from(recording.response.body, "base64").toString("utf8");
  }
  return recording.response.body ?? "";
}

function extractToolCalls(text) {
  try {
    return extractToolCallsFromJson(JSON.parse(text));
  } catch {
    const tools = [];
    for (const line of text.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        tools.push(...extractToolCallsFromJson(JSON.parse(payload)));
      } catch {
        // Ignore malformed or provider-specific event lines.
      }
    }
    return tools;
  }
}

export function summarizeRecordings(recordings) {
  const endpoints = new Map();
  const models = new Map();
  const tools = new Map();

  for (const recording of recordings) {
    const endpoint = `${recording.request.method} ${recording.request.path}`;
    endpoints.set(endpoint, (endpoints.get(endpoint) ?? 0) + 1);

    const model = recording.request.body?.model;
    if (typeof model === "string" && model) {
      models.set(model, (models.get(model) ?? 0) + 1);
    }

    for (const tool of extractToolCalls(decodeResponse(recording))) {
      tools.set(tool, (tools.get(tool) ?? 0) + 1);
    }
  }

  const sorted = (map) => [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return {
    recordings: recordings.length,
    endpoints: sorted(endpoints),
    models: sorted(models),
    tools: sorted(tools),
  };
}

export function formatSummary(summary) {
  const lines = [`Aurat recordings: ${summary.recordings}`];
  const section = (title, entries) => {
    if (entries.length === 0) return;
    lines.push("", title);
    for (const [name, count] of entries) lines.push(`  ${count.toString().padStart(4)}  ${name}`);
  };

  section("Endpoints", summary.endpoints);
  section("Models", summary.models);
  section("Observed tool calls", summary.tools);
  return `${lines.join("\n")}\n`;
}
