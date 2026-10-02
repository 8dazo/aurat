import { fingerprintRequest } from "./fingerprint.js";
import { redact, redactPayload } from "./redact.js";

const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const nonempty = (value) =>
  typeof value === "string" && value.trim().length > 0;
const requestOptions = new Set([
  "temperature",
  "top_p",
  "max_tokens",
  "max_completion_tokens",
  "seed",
  "presence_penalty",
  "frequency_penalty",
  "stop",
  "tools",
  "tool_choice",
  "response_format",
  "parallel_tool_calls",
  "stream",
  "stream_options",
  "n",
  "user",
  "logprobs",
  "top_logprobs",
  "service_tier",
  "reasoning_effort",
  "store",
  "metadata",
]);
function structured(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
function contentSupported(content) {
  return (
    content === null ||
    typeof content === "string" ||
    (Array.isArray(content) &&
      content.length > 0 &&
      content.every(
        (part) =>
          object(part) && part.type === "text" && typeof part.text === "string",
      ))
  );
}
function messageSupported(message) {
  if (
    !object(message) ||
    !["system", "developer", "user", "assistant", "tool"].includes(message.role)
  )
    return false;
  if (message.function_call !== undefined || message.audio !== undefined)
    return false;
  if (message.content !== undefined && !contentSupported(message.content))
    return false;
  if (message.tool_calls !== undefined) {
    if (
      message.role !== "assistant" ||
      !Array.isArray(message.tool_calls) ||
      !message.tool_calls.length
    )
      return false;
    if (
      !message.tool_calls.every((call) => {
        if (
          !object(call) ||
          call.type !== "function" ||
          !nonempty(call.id) ||
          !object(call.function) ||
          !nonempty(call.function.name) ||
          typeof call.function.arguments !== "string"
        )
          return false;
        try {
          return object(JSON.parse(call.function.arguments));
        } catch {
          return false;
        }
      })
    )
      return false;
  }
  if (message.role === "tool" && !nonempty(message.tool_call_id)) return false;
  if (
    message.refusal !== undefined &&
    message.refusal !== null &&
    typeof message.refusal !== "string"
  )
    return false;
  return (
    (message.content !== undefined && message.content !== null) ||
    !!message.tool_calls?.length ||
    nonempty(message.refusal)
  );
}
function cleanMessage(message) {
  const safe = redact(message);
  // Tool arguments are JSON encoded inside JSON: redact the parsed inner values too.
  if (safe.tool_calls)
    safe.tool_calls = safe.tool_calls.map((call) => ({
      ...call,
      function: {
        ...call.function,
        arguments: redactPayload(call.function.arguments),
      },
    }));
  if (safe.role === "tool" && typeof safe.content === "string")
    safe.content = redactPayload(safe.content);
  return safe;
}

// Langfuse accepts arbitrary I/O. Only captured, non-streaming OpenAI-compatible
// chat generations are converted. Never drop image/tool content to make a row fit.
export function langfuseObservationToRecording(observation) {
  if (!object(observation) || observation.type !== "GENERATION")
    return { skip: "unsupported_observation_type" };
  if (!nonempty(observation.id) || !nonempty(observation.traceId))
    return { skip: "missing_source_identity" };
  if (observation.level === "ERROR") return { skip: "errored_generation" };
  const start = Date.parse(observation.startTime),
    end = Date.parse(observation.endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
    return { skip: "incomplete_generation" };
  if (Buffer.byteLength(JSON.stringify(observation)) > 262144)
    return { skip: "observation_too_large" };
  const input = structured(observation.input),
    output = structured(observation.output);
  const messages = Array.isArray(input) ? input : input?.messages;
  if (
    !Array.isArray(messages) ||
    !messages.length ||
    !messages.every(messageSupported)
  )
    return { skip: "unsupported_input_messages" };
  const parameters = structured(observation.modelParameters) ?? {};
  if (
    !object(parameters) ||
    Object.keys(parameters).some((key) => !requestOptions.has(key))
  )
    return { skip: "unsupported_model_parameters" };
  if (
    !Array.isArray(input) &&
    (!object(input) ||
      Object.keys(input).some(
        (key) =>
          !["model", "messages"].includes(key) && !requestOptions.has(key),
      ))
  )
    return { skip: "unsupported_request_fields" };
  const model = (!Array.isArray(input) && input.model) || observation.model;
  if (!nonempty(model)) return { skip: "missing_model" };
  const body = {
    ...parameters,
    ...(Array.isArray(input) ? {} : input),
    model,
    messages: messages.map(cleanMessage),
  };
  if (body.stream !== undefined && body.stream !== false)
    return { skip: "unsupported_streaming" };
  body.stream = false;
  if (
    body.tools !== undefined &&
    (!Array.isArray(body.tools) ||
      !body.tools.every(
        (tool) =>
          object(tool) &&
          tool.type === "function" &&
          object(tool.function) &&
          nonempty(tool.function.name),
      ))
  )
    return { skip: "unsupported_tools" };
  let choices;
  if (object(output) && Array.isArray(output.choices)) {
    choices = output.choices;
  } else {
    // A captured plain answer is represented as text; no finish reason is invented.
    const message =
      typeof output === "string"
        ? { role: "assistant", content: output }
        : output;
    choices = [{ index: 0, message, finish_reason: null }];
  }
  if (
    !choices.length ||
    choices.length > 20 ||
    !choices.every(
      (choice, index) =>
        object(choice) &&
        (choice.index === undefined || choice.index === index) &&
        messageSupported(choice.message) &&
        choice.message.role === "assistant" &&
        (choice.finish_reason == null ||
          typeof choice.finish_reason === "string"),
    )
  )
    return { skip: "unsupported_output_messages" };
  const request = {
    method: "POST",
    path: "/v1/chat/completions",
    body: redact(body),
  };
  const response = redact({
    id: nonempty(output?.id) ? output.id : `langfuse_${observation.id}`,
    object: "chat.completion",
    model: nonempty(output?.model) ? output.model : model,
    choices: choices.map((choice, index) => ({
      index,
      message: cleanMessage(choice.message),
      finish_reason: choice.finish_reason ?? null,
    })),
    ...(object(output?.usage) ? { usage: output.usage } : {}),
  });
  return {
    recording: {
      version: 2,
      fingerprint: fingerprintRequest(request),
      createdAt: new Date(start).toISOString(),
      request,
      response: {
        status: 200,
        headers: { "content-type": "application/json" },
        body: Buffer.from(JSON.stringify(response)).toString("base64"),
        bodyEncoding: "base64",
      },
      metadata: {
        source: "langfuse",
        traceId: observation.traceId,
        spanId: observation.id,
        operation: "chat",
        normalization: "captured-chat-generation",
        startTime: new Date(start).toISOString(),
        endTime: new Date(end).toISOString(),
      },
    },
  };
}
