import { readFile } from "node:fs/promises";

export const DEFAULT_MATCHING = Object.freeze({
  ignoreBodyPaths: [],
  ignoreQueryParams: [],
});

function stringArray(value, name) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    throw new Error(`${name} must be an array of non-empty strings`);
  }
  return [...new Set(value)];
}

export function normalizeConfig(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Aurat config must be a JSON object");
  }

  const match = value.match ?? {};
  if (!match || typeof match !== "object" || Array.isArray(match)) {
    throw new Error("config.match must be a JSON object");
  }

  return {
    match: {
      ignoreBodyPaths: stringArray(match.ignoreBodyPaths, "config.match.ignoreBodyPaths"),
      ignoreQueryParams: stringArray(match.ignoreQueryParams, "config.match.ignoreQueryParams"),
    },
  };
}

export async function loadAuratConfig(path) {
  try {
    const contents = await readFile(path, "utf8");
    return normalizeConfig(JSON.parse(contents));
  } catch (error) {
    if (error?.code === "ENOENT") return normalizeConfig();
    if (error instanceof SyntaxError) throw new Error(`Invalid JSON in Aurat config ${path}: ${error.message}`);
    throw error;
  }
}
