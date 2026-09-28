import { createHash } from "node:crypto";

// Stable aliases keep request matching and relationships intact after redaction.
// This is a secrets baseline, not a general-purpose PII detector.
const sensitiveKey = /^(authorization|proxy-authorization|cookie|set-cookie|api[-_]?key|access[-_]?token|refresh[-_]?token|password|secret)$/i;
const secrets = /\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+)\b|Bearer\s+[A-Za-z0-9._-]{8,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/gi;
function alias(value) {
  if (/^\[aurat-redacted:[a-f0-9]{16}\]$/.test(value)) return value;
  return `[aurat-redacted:${createHash("sha256").update(String(value)).digest("hex").slice(0, 16)}]`;
}
export function redactText(value) { return String(value).replace(secrets, alias); }
export function redact(value) {
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) =>
      [key, sensitiveKey.test(key) ? alias(typeof child === "string" ? child : JSON.stringify(child)) : redact(child)]));
  }
  return value;
}
export function redactPayload(text) {
  try { return JSON.stringify(redact(JSON.parse(text))); } catch {
    return text.split("\n").map(line => {
      if (!line.startsWith("data:")) return redactText(line);
      const payload = line.slice(5).trim();
      try { const safe = redact(JSON.parse(payload)); return JSON.stringify(JSON.parse(payload)) === JSON.stringify(safe) ? line : `data: ${JSON.stringify(safe)}`; }
      catch { return redactText(line); }
    }).join("\n");
  }
}

export function redactPath(path) {
  const index = path.indexOf("?");
  if (index < 0) return redactText(path);
  const params = new URLSearchParams(path.slice(index + 1));
  let changed = false;
  for (const [key, value] of [...params]) {
    const safe = sensitiveKey.test(key) ? alias(value) : redactText(value);
    if (safe !== value) { params.set(key, safe); changed = true; }
  }
  return redactText(path.slice(0, index)) + "?" + (changed ? params.toString() : path.slice(index + 1));
}
