# Render public frontend

Render hosts the landing page, documentation and read-only Scout example dashboard.
The existing private Sites deployment continues to host saved projects, reports,
authentication and D1 data. The public frontend links to that workspace rather
than trusting spoofable ChatGPT identity headers on a different host.

This is a public frontend deployment, **not a database or authentication migration**.
No user reports, secrets, APIs or database bindings are included in the export.
All interactive frontend styling, motion, filters, report detail sheets and example
JSON downloads are retained. Write controls remain read-only in the labelled demo.

## Build

From `apps/platform`, install dependencies with the committed pnpm lockfile, then:

```sh
node scripts/build-render.mjs
```

The script builds a standard Next.js static export in `.render-build/out` from an
explicit source allowlist. It does not alter the existing Sites application.
Render's build command, public directory and reproducible service definition are
in the root `render.yaml`. No paid compute or database is provisioned. Static-site
bandwidth and build minutes use the workspace's included quotas.

## Full standalone platform follow-up

To move saved workspaces off Sites, configure independent authentication and a
durable database, migrate owner IDs and data explicitly, verify tenant isolation,
then switch the workspace links. Do not forward the current trusted identity
headers from an untrusted public client. Do not use ephemeral local SQLite for
saved reports on a free Render web service.
