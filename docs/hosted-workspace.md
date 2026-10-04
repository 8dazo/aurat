# Hosted private workspace

Vercel runs three services. `aurat` is the public gateway at `/`.
`platform` is the internal Next.js frontend. `workspace` is the internal
Node.js API. The gateway binds `PLATFORM_URL` and `WORKSPACE_URL`; Vercel
injects these runtime URLs. Do not configure binding variables yourself.

The gateway sends `/api/*`, `/mcp`, and `/health` to the workspace and all
other paths to the frontend. Workspace APIs require a bearer access key;
CI ingestion and signed webhooks retain their dedicated authentication.
Only API requests forward authorization. Cookies and trusted identity
headers never cross the gateway.

Set production secrets `DATABASE_URL` (pooled Neon URL),
`DATABASE_URL_UNPOOLED` (direct migration URL), and `AURAT_WORKSPACE_TOKEN`.
Do not reuse production storage or keys in preview deployments. The workspace
build applies tracked additive migrations in the dedicated `aurat` schema.
Database setup failures fail the deployment rather than falling back to SQLite.

Open Connections, use the site's HTTPS origin as API URL, and enter the
workspace key. The key stays in memory and clears on reload. A key grants
full access to a single workspace; team accounts and per-user permissions
are not implemented. Production database credentials never enter the browser.

Hosted jobs are request-driven: authenticated job polling or trigger requests
advance one leased job. Continuous unattended scheduling requires a durable
worker or authenticated scheduler. Merely enqueueing a job does not guarantee
it will run without subsequent polling.

The mobile sidebar closes after navigation and includes a visible close
button. Its toggle exposes expanded state for assistive technology.
