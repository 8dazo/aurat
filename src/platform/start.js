import { createServer } from "node:http";
import { WorkspaceStore } from "./storage.js";
import { PlatformService } from "./service.js";
import { handler } from "./http.js";

if (process.env.VERCEL)
  throw new Error(
    "Local SQLite is not durable on Vercel. Configure a persistent Postgres adapter before hosting this service.",
  );
const store = new WorkspaceStore(
  process.env.AURAT_DB_PATH ?? ".aurat/workspace.sqlite",
);
const service = new PlatformService(store);
const server = createServer(
  handler(service, {
    token: process.env.AURAT_WORKSPACE_TOKEN,
    allowedOrigins: (
      process.env.AURAT_ALLOWED_ORIGINS ??
      "http://localhost:3000,http://127.0.0.1:3000"
    )
      .split(",")
      .filter(Boolean),
  }),
);
let running = false;
const tick = async () => {
  if (running) return;
  running = true;
  try {
    while (await service.workOne()) {}
  } catch {
    console.error("Worker could not process jobs");
  } finally {
    running = false;
  }
};
const timer = setInterval(() => void tick(), 1000);
timer.unref();
server.listen(Number(process.env.AURAT_API_PORT ?? 4318), "127.0.0.1", () =>
  console.log("Aurat private API: http://127.0.0.1:" + server.address().port),
);
let closing = false;
async function stop() {
  if (closing) return;
  closing = true;
  clearInterval(timer);
  server.close(async () => {
    while (running) await new Promise((resolve) => setTimeout(resolve, 20));
    store.close();
  });
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
