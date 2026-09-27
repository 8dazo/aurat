const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

const PROFILES = {
  "rate-limit": {
    status: 429,
    headers: { ...JSON_HEADERS, "retry-after": "1" },
    body: JSON.stringify({
      error: {
        message: "Aurat injected a provider rate limit.",
        type: "rate_limit_error",
        code: "rate_limit_exceeded",
      },
    }),
  },
  "server-error": {
    status: 500,
    headers: JSON_HEADERS,
    body: JSON.stringify({
      error: {
        message: "Aurat injected a provider server error.",
        type: "server_error",
        code: "internal_error",
      },
    }),
  },
  "malformed-json": {
    status: 200,
    headers: JSON_HEADERS,
    body: '{"id":"aurat-injected","choices":[',
  },
  "empty-response": {
    status: 200,
    headers: JSON_HEADERS,
    body: "",
  },
  "connection-reset": {
    disconnect: true,
  },
};

export const FAULT_NAMES = Object.freeze(Object.keys(PROFILES));

export function getFaultProfile(name) {
  if (!name) return null;
  const profile = PROFILES[name];
  if (!profile) {
    throw new Error(`Unknown Aurat fault ${JSON.stringify(name)}. Expected one of: ${FAULT_NAMES.join(", ")}`);
  }
  return { name, ...profile };
}
