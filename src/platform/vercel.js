import { openStore } from "./database.js";
import { PlatformService } from "./service.js";
import { handler } from "./http.js";

// Lazy initialization keeps builds independent of runtime service bindings.
let ready;
async function initialize() {
  const store = await openStore();
  const service = new PlatformService(store);
  const origins = (process.env.AURAT_ALLOWED_ORIGINS ?? "https://aurat.ai")
    .split(",").filter(Boolean);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    origins.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  if (process.env.VERCEL_URL) origins.push(`https://${process.env.VERCEL_URL}`);
  return { service, handle: handler(service, {
    token: process.env.AURAT_WORKSPACE_TOKEN, allowedOrigins: origins,
  }) };
}
export default async function workspace(req, res) {
  try {
    if (!ready) ready = initialize().catch((error) => { ready = undefined; throw error; });
    const { service, handle } = await ready;
    // Request-driven, leased jobs; no timer that outlives a serverless invocation.
    // Polling jobs or firing a trigger advances at most one job per request.
    if (req.headers.authorization === `Bearer ${process.env.AURAT_WORKSPACE_TOKEN}`
      && /^\/api\/(jobs|triggers)(\/|\?|$)/.test(req.url)) {
      await service.workOne();
    }
    await handle(req, res);
  } catch {
    if (!res.headersSent) {
      res.writeHead(503, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ error: "Workspace unavailable; check database configuration." }));
    } else res.destroy();
  }
}
