import { createHash } from "node:crypto";
import { redact, redactPath } from "./redact.js";

function pathMatches(pattern, path) {
  const segments = pattern.split(".");
  if (segments.length !== path.length) return false;
  return segments.every((segment, index) => segment === "*" || segment === path[index]);
}

function ignored(path, patterns) {
  return patterns.some((pattern) => pathMatches(pattern, path));
}

function normalize(value, options, path = []) {
  if (Array.isArray(value)) {
    return value.map((child, index) => normalize(child, options, [...path, String(index)]));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        // Kept as a built-in compatibility rule: SDKs can add stream_options
        // without changing the semantic model request.
        .filter(([key]) => !(path.length === 0 && key === "stream_options"))
        .filter(([key]) => !ignored([...path, key], options.ignoreBodyPaths))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, normalize(child, options, [...path, key])]),
    );
  }

  return value;
}

function normalizePath(requestPath, ignoreQueryParams) {
  if (ignoreQueryParams.length === 0 || !requestPath.includes("?")) return requestPath;

  const parsed = new URL(requestPath, "http://aurat.local");
  for (const name of ignoreQueryParams) parsed.searchParams.delete(name);
  const query = parsed.searchParams.toString();
  return `${parsed.pathname}${query ? `?${query}` : ""}${parsed.hash}`;
}

export function canonicalJson(value, matching = {}) {
  const options = {
    ignoreBodyPaths: matching.ignoreBodyPaths ?? [],
    ignoreQueryParams: matching.ignoreQueryParams ?? [],
  };
  return JSON.stringify(normalize(value, options));
}

export function fingerprintRequest({ method, path, body }, matching = {}) {
  const options = {
    ignoreBodyPaths: matching.ignoreBodyPaths ?? [],
    ignoreQueryParams: matching.ignoreQueryParams ?? [],
  };
  const payload = [
    method.toUpperCase(),
    normalizePath(redactPath(path), options.ignoreQueryParams),
    canonicalJson(redact(body), options),
  ].join("\n");
  return createHash("sha256").update(payload).digest("hex");
}
