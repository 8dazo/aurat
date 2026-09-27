import { createHash } from "node:crypto";

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalize);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalize(item)]),
    );
  }

  return value;
}

export function parseBody(body: Buffer): unknown {
  if (body.length === 0) return null;

  const text = body.toString("utf8");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export function createRequestFingerprint(
  method: string,
  path: string,
  body: Buffer,
): string {
  const payload = stableStringify({
    method: method.toUpperCase(),
    path,
    body: parseBody(body),
  });

  return createHash("sha256").update(payload).digest("hex");
}
