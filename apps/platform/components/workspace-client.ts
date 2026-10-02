"use client";
import { useSyncExternalStore } from "react";
export type ApiSession = {
  base: string;
  request: (path: string, body?: unknown) => Promise<any>;
};
let current: ApiSession | null = null;
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
export function useApiSession() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}
export function disconnectApi() {
  current = null;
  listeners.forEach((fn) => fn());
}
export async function connectApi(baseValue: string, token: string) {
  const base = new URL(baseValue);
  // This is a local development workspace, not a generic outbound URL connector.
  if (
    !["localhost", "127.0.0.1"].includes(base.hostname) ||
    base.protocol !== "http:" ||
    base.username ||
    base.password ||
    base.pathname !== "/" ||
    base.search ||
    base.hash
  )
    throw Error("Use the local API URL, such as http://127.0.0.1:4318");
  if (
    window.location.protocol !== "http:" ||
    !["localhost", "127.0.0.1"].includes(window.location.hostname)
  )
    throw Error(
      "Open the dashboard locally to connect the temporary database. Hosted access will be enabled with Neon and account authentication.",
    );
  if (token.length < 32)
    throw Error("Enter your server workspace token (at least 32 characters)");
  const request = async (path: string, body?: unknown) => {
    const response = await fetch(new URL(path, base), {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    });
    const data = await response.json();
    if (!response.ok) throw Error(data.error ?? "API request failed");
    return data;
  };
  await request("/api/workspace");
  current = { base: base.origin, request };
  listeners.forEach((fn) => fn());
}
