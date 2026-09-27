import { createHash } from "node:crypto";

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== "stream_options")
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, normalize(child)]),
    );
  }

  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(normalize(value));
}

export function fingerprintRequest({ method, path, body }) {
  const payload = [method.toUpperCase(), path, canonicalJson(body)].join("\n");
  return createHash("sha256").update(payload).digest("hex");
}
