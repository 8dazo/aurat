import { fingerprintRequest } from "./fingerprint.js";

function decodeValue(value) {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object" || Array.isArray(value)) return value;
  if ("stringValue" in value) return value.stringValue;
  if ("boolValue" in value) return value.boolValue;
  if ("intValue" in value) return Number(value.intValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("bytesValue" in value) return value.bytesValue;
  if (value.arrayValue?.values) return value.arrayValue.values.map(decodeValue);
  if (value.kvlistValue?.values) {
    return Object.fromEntries(value.kvlistValue.values.map((entry) => [entry.key, decodeValue(entry.value)]));
  }
  return value;
}

export function decodeAttributes(attributes) {
  if (!attributes) return {};
  if (!Array.isArray(attributes)) return { ...attributes };
  return Object.fromEntries(attributes.map((attribute) => [attribute.key, decodeValue(attribute.value)]));
}

function structured(value) {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return value; }
}

function mergedSpanAttributes(span) {
  const result = decodeAttributes(span.attributes);
  for (const event of span.events ?? []) {
    const eventAttributes = decodeAttributes(event.attributes);
    for (const [key, value] of Object.entries(eventAttributes)) {
      if (result[key] === undefined) result[key] = value;
    }
  }
  return result;
}

export function collectOtlpSpans(document) {
  if (Array.isArray(document)) return document;
  if (Array.isArray(document?.spans)) return document.spans;

  const spans = [];
  for (const resourceSpan of document?.resourceSpans ?? []) {
    const groups = resourceSpan.scopeSpans ?? resourceSpan.instrumentationLibrarySpans ?? [];
    for (const group of groups) spans.push(...(group.spans ?? []));
  }
  return spans;
}

function textFromParts(parts = []) {
  return parts
    .filter((part) => part?.type === "text" && typeof part.content === "string")
    .map((part) => part.content)
    .join("\n");
}

function toolCallsFromParts(parts = []) {
  return parts
    .filter((part) => part?.type === "tool_call" && typeof part.name === "string")
    .map((part, index) => ({
      id: typeof part.id === "string" && part.id ? part.id : `otel_call_${index}`,
      type: "function",
      function: {
        name: part.name,
        arguments: typeof part.arguments === "string" ? part.arguments : JSON.stringify(part.arguments ?? {}),
      },
    }));
}

function inputMessages(messages, systemInstructions) {
  const result = [];
  const instructions = Array.isArray(systemInstructions) ? textFromParts(systemInstructions) : "";
  if (instructions) result.push({ role: "system", content: instructions });

  for (const message of messages) {
    const role = message?.role;
    const parts = Array.isArray(message?.parts) ? message.parts : [];
    if (role === "tool") {
      for (const part of parts.filter((item) => item?.type === "tool_call_response")) {
        const response = part.response ?? part.result ?? "";
        result.push({
          role: "tool",
          tool_call_id: part.id ?? "otel_call",
          content: typeof response === "string" ? response : JSON.stringify(response),
        });
      }
      continue;
    }

    if (!["user", "assistant", "system", "developer"].includes(role)) continue;
    const content = textFromParts(parts);
    const toolCalls = role === "assistant" ? toolCallsFromParts(parts) : [];
    const converted = { role, content: content || (toolCalls.length ? null : "") };
    if (toolCalls.length) converted.tool_calls = toolCalls;
    result.push(converted);
  }
  return result;
}

function openAiTools(definitions) {
  if (!Array.isArray(definitions)) return undefined;
  const tools = definitions
    .filter((definition) => definition?.type === "function" && typeof definition.name === "string")
    .map((definition) => ({
      type: "function",
      function: {
        name: definition.name,
        ...(definition.description ? { description: definition.description } : {}),
        parameters: definition.parameters ?? { type: "object", properties: {} },
      },
    }));
  return tools.length ? tools : undefined;
}

function outputMessage(message) {
  const parts = Array.isArray(message?.parts) ? message.parts : [];
  const content = textFromParts(parts);
  const toolCalls = toolCallsFromParts(parts);
  const converted = { role: "assistant", content: content || (toolCalls.length ? null : "") };
  if (toolCalls.length) converted.tool_calls = toolCalls;
  return converted;
}

function finishReason(message, spanReasons, index) {
  if (typeof message?.finish_reason === "string" && message.finish_reason) return message.finish_reason;
  if (Array.isArray(spanReasons) && typeof spanReasons[index] === "string" && spanReasons[index]) return spanReasons[index];
  return toolCallsFromParts(message?.parts ?? []).length ? "tool_calls" : "stop";
}

function completionResponse({ attrs, outputs, model }) {
  const responseModel = attrs["gen_ai.response.model"] ?? model;
  const id = attrs["gen_ai.response.id"] ?? `otel_${Date.now()}`;
  const finishReasons = structured(attrs["gen_ai.response.finish_reasons"]);
  return {
    id,
    object: "chat.completion",
    model: responseModel,
    choices: outputs.map((message, index) => ({
      index,
      message: outputMessage(message),
      finish_reason: finishReason(message, finishReasons, index),
    })),
  };
}

function completionStream({ attrs, outputs, model }) {
  const response = completionResponse({ attrs, outputs, model });
  const events = response.choices.map((choice) => ({
    id: response.id,
    object: "chat.completion.chunk",
    model: response.model,
    choices: [{
      index: choice.index,
      delta: choice.message,
      finish_reason: choice.finish_reason,
    }],
  }));
  return `${events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("")}data: [DONE]\n\n`;
}

function addRequestOptions(body, attrs) {
  const mappings = [
    ["gen_ai.request.temperature", "temperature"],
    ["gen_ai.request.top_p", "top_p"],
    ["gen_ai.request.max_tokens", "max_tokens"],
    ["gen_ai.request.seed", "seed"],
    ["gen_ai.request.presence_penalty", "presence_penalty"],
    ["gen_ai.request.frequency_penalty", "frequency_penalty"],
  ];
  for (const [attribute, field] of mappings) {
    if (attrs[attribute] !== undefined) body[field] = attrs[attribute];
  }
  const stop = structured(attrs["gen_ai.request.stop_sequences"]);
  if (Array.isArray(stop) && stop.length) body.stop = stop;
}

export function otelSpanToRecording(span) {
  const attrs = mergedSpanAttributes(span);
  const model = attrs["gen_ai.request.model"];
  const inputs = structured(attrs["gen_ai.input.messages"]);
  const outputs = structured(attrs["gen_ai.output.messages"]);
  const operation = attrs["gen_ai.operation.name"];
  const apiType = attrs["openai.api.type"];

  if (!model) return { skip: "missing_model" };
  if (apiType === "responses") return { skip: "unsupported_responses_api" };
  if (operation && !["chat", "chat_completions"].includes(operation)) return { skip: "unsupported_operation" };
  if (!Array.isArray(inputs) || !Array.isArray(outputs)) return { skip: "missing_message_content" };
  if (outputs.length === 0) return { skip: "missing_output" };
  if (attrs["error.type"]) return { skip: "errored_span" };

  const stream = attrs["gen_ai.request.stream"] === true;
  const body = {
    model,
    messages: inputMessages(inputs, structured(attrs["gen_ai.system_instructions"])),
    stream,
  };
  addRequestOptions(body, attrs);
  const tools = openAiTools(structured(attrs["gen_ai.tool.definitions"]));
  if (tools) body.tools = tools;

  const request = { method: "POST", path: "/v1/chat/completions", body };
  const fingerprint = fingerprintRequest(request);
  const responseText = stream
    ? completionStream({ attrs, outputs, model })
    : JSON.stringify(completionResponse({ attrs, outputs, model }));

  return {
    recording: {
      version: 2,
      fingerprint,
      createdAt: new Date().toISOString(),
      request,
      response: {
        status: 200,
        headers: { "content-type": stream ? "text/event-stream" : "application/json" },
        body: Buffer.from(responseText).toString("base64"),
        bodyEncoding: "base64",
      },
      metadata: {
        source: "opentelemetry",
        traceId: span.traceId ?? null,
        spanId: span.spanId ?? null,
        provider: attrs["gen_ai.provider.name"] ?? null,
        operation: operation ?? "chat",
      },
    },
  };
}

export function convertOtlpDocument(document) {
  const spans = collectOtlpSpans(document);
  const recordings = [];
  const skipped = {};

  for (const span of spans) {
    const result = otelSpanToRecording(span);
    if (result.recording) recordings.push(result.recording);
    else skipped[result.skip] = (skipped[result.skip] ?? 0) + 1;
  }

  return { scanned: spans.length, imported: recordings.length, recordings, skipped };
}

export function formatOtelImport(result) {
  const lines = [
    "Aurat OpenTelemetry import",
    `Spans: ${result.scanned} scanned`,
    `Imported: ${result.imported}`,
    `Skipped: ${result.scanned - result.imported}`,
  ];
  const reasons = Object.entries(result.skipped).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (reasons.length) {
    lines.push("", "Skip reasons");
    for (const [reason, count] of reasons) lines.push(`  ${count.toString().padStart(4)}  ${reason}`);
  }
  return `${lines.join("\n")}\n`;
}
