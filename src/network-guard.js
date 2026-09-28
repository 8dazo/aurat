if (Number(process.versions.node.split(".")[0]) < 22) throw new Error("Aurat HTTP guard requires Node 22 or newer");
import { BatchInterceptor } from "@mswjs/interceptors";
import { ClientRequestInterceptor } from "@mswjs/interceptors/ClientRequest";
import { FetchInterceptor } from "@mswjs/interceptors/fetch";
import { emitEvent } from "./events.js";

// Preloaded in Node subprocesses. This is an HTTP guard, not an OS sandbox.
if (process.env.AURAT_MODE === "replay" && process.env.AURAT_PROXY_URL) {
  const allowed = new URL(process.env.AURAT_PROXY_URL).origin;
  const interceptor = new BatchInterceptor({ name: "aurat-offline", interceptors: [new ClientRequestInterceptor(), new FetchInterceptor()] });
  interceptor.on("request", ({ request, controller }) => {
    const url = new URL(request.url);
    if (url.origin === allowed) return;
    emitEvent({ type: "network_blocked", method: request.method, origin: url.origin });
    controller.errorWith(new Error(`Aurat offline HTTP guard blocked ${request.method} ${url.origin}`));
  });
  interceptor.apply();
  emitEvent({ type: "guard_ready", pid: process.pid });
}
