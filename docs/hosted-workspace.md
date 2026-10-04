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

Hosted dashboard users sign in at `/signin/`. The gateway verifies the configured
owner password using scrypt and issues an eight-hour Secure, HttpOnly, SameSite
session cookie. The dashboard reconnects automatically, including after reload.
Connections has no hosted API URL or workspace-key fields. Verified sessions
allow the gateway to inject the private workspace bearer key server-side;
database credentials and workspace keys never enter browser JavaScript.

Initialize the owner once with `node services/vercel-gateway/init-account.mjs`
from the repository root. It creates ignored `.aurat/account.env`. Configure
`AURAT_LOGIN_USER`, `AURAT_LOGIN_PASSWORD_HASH`, `AURAT_SESSION_SECRET`, and an
explicit comma-separated `AURAT_ALLOWED_ORIGINS` in production Vercel environment
variables. Upload the password hash, never the plaintext password. Keep the local
generated password privately and change it by generating a new salted hash.
Rotate the session secret to revoke all sessions. Sign-out clears the browser
cookie. Password reset and team accounts are not implemented.

Use the verified production address `https://aurat-eight.vercel.app/app/`.
The apex `aurat.ai` currently redirects to `www.aurat.ai`, which still needs
Vercel ownership verification. Only verified project domains belong in the
production origin allowlist. Session secrets and database URLs belong in Vercel
environment variables, not Connections.

The public frontend copies components into ignored generated directories.
Its Tailwind stylesheet explicitly registers those directories with `@source`;
without that registration, the export omitted responsive sidebar and component
utilities. The workspace browser workflow tests the built public export over
HTTPS, including sign-in, project creation, all navigation routes, session
restoration, mobile sidebar dismissal, and widths 1440, 820 and 390.

This is one owner account with full access to one workspace, not multi-user SaaS.
Per-instance bounded sign-in throttling complements platform firewall controls;
it is not a distributed lockout mechanism. Cookie-authenticated writes require
an exact allowed Origin; bearer integrations retain their existing authentication.

Hosted jobs are request-driven: authenticated job polling or trigger requests
advance one leased job. Continuous unattended scheduling requires a durable
worker or authenticated scheduler. Merely enqueueing a job does not guarantee
it will run without subsequent polling.

The mobile sidebar closes after navigation and includes a visible close
button. Its toggle exposes expanded state for assistive technology.
