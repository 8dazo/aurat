"use client";
import { useEffect, useSyncExternalStore } from "react";
export type ApiSession = {
  base: string;
  hosted?: boolean;
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
  useEffect(() => {
    if (window.location.protocol === "https:" && new URLSearchParams(window.location.search).get("demo") !== "1") {
      void connectHosted().catch(() => {});
    }
  }, []);
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
let connecting: Promise<void> | null = null;
export function connectHosted() {
  if (current) return Promise.resolve();
  if (connecting) return connecting;
  connecting = (async () => {
    const request = async (path: string, body?: unknown) => {
      const response = await fetch(path, {
        method: body !== undefined ? "POST" : "GET", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        redirect: "error", signal: AbortSignal.timeout(30000),
      });
      if (response.status === 401) {
        window.location.assign('/signin/?returnTo=' + encodeURIComponent(window.location.pathname + window.location.search));
        throw Error("Sign in to your workspace");
      }
      const data = await response.json();
      if (!response.ok) throw Error(typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string' ? data.error : "Workspace request failed");
      return data;
    };
    await request('/api/workspace');
    current = { base: window.location.origin, hosted: true, request };
    listeners.forEach(fn => fn());
  })().finally(() => { connecting = null; });
  return connecting;
}
export async function signOut() {
  await fetch('/api/auth/signout', { method: 'POST', credentials: 'same-origin' });
  disconnectApi();
  window.location.assign('/signin/');
}
export async function connectApi(baseValue: string, token: string) {
  const base = new URL(baseValue);
  const hosted = base.protocol === "https:" && base.origin === window.location.origin;
  const local = base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname) && window.location.protocol === "http:" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (
    !(hosted || local) ||
    base.username ||
    base.password ||
    base.pathname !== "/" ||
    base.search ||
    base.hash
  )
    throw Error("Use this site's HTTPS origin or a local API from a local dashboard");
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
    if (!response.ok) {
      const message =
        typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof data.error === "string"
          ? data.error
          : "API request failed";
      throw Error(message);
    }
    return data;
  };
  await request("/api/workspace");
  current = { base: base.origin, request };
  listeners.forEach((fn) => fn());
}
