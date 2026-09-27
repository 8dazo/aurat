# OpenTelemetry import

Aurat can bootstrap deterministic recordings from an existing OpenTelemetry OTLP JSON export instead of requiring a team to route traffic through the Aurat proxy first.

```bash
node src/cli.js import-otel traces.json
node src/cli.js inspect
node src/cli.js contract
```

## Required GenAI content

The importer follows the current OpenTelemetry GenAI structured attributes:

- `gen_ai.request.model`
- `gen_ai.input.messages`
- `gen_ai.output.messages`

It also consumes, when present:

- `gen_ai.system_instructions`
- `gen_ai.tool.definitions`
- `gen_ai.request.stream`
- request temperature/top-p/max-tokens/seed/penalties/stop sequences
- `gen_ai.response.id`
- `gen_ai.response.model`
- `gen_ai.response.finish_reasons`
- `gen_ai.provider.name`
- `openai.api.type`

OpenTelemetry allows message-bearing attributes to be represented as structured values or JSON strings on spans; Aurat accepts both. Aurat also looks for missing GenAI attributes on span events.

## Privacy and completeness

OpenTelemetry treats message content, system instructions, and tool definitions as opt-in content because they can contain sensitive information. If an export only contains model/token/latency metadata and does not contain `gen_ai.input.messages` and `gen_ai.output.messages`, Aurat reports `missing_message_content` and skips the span rather than fabricating a test.

Review and sanitize telemetry before committing generated recordings to source control.

## Normalization

V1 normalizes supported GenAI `chat` spans into OpenAI-compatible `/v1/chat/completions` recordings:

- OTel text parts become chat message content;
- OTel `tool_call` parts become OpenAI-style function tool calls;
- `tool_call_response` parts become tool messages;
- OTel tool definitions become OpenAI function definitions;
- streaming spans become deterministic SSE recordings;
- non-streaming spans become deterministic chat-completion JSON recordings.

This makes imported spans immediately usable by `aurat replay`, `aurat contract`, and `aurat verify`.

## Intentional V1 limits

The importer currently skips:

- OpenAI Responses API spans (`openai.api.type=responses`);
- non-chat GenAI operations;
- errored spans;
- spans missing the request model;
- spans without captured input/output message content.

This is deliberate. V1 prefers explicit skipped scenarios over a misleading replay fixture.
