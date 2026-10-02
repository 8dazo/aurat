# Vercel Services deployment

This configuration serves the public demo through a Node gateway and an internal
Next.js frontend. All workspace links remain on the deployed domain. The dashboard is a read-only demo.

The Render blueprint builds a **static export of the platform**. It does not
define a second Node API backend. The repository's CLI and replay server remain
local tools, and are not hosted by this configuration.

| Service | Root | Public ingress | Calls |
| --- | --- | --- | --- |
| `aurat` | `services/vercel-gateway` | All paths, through the final catch-all rewrite | `platform` using runtime `PLATFORM_URL` |
| `platform` | `apps/vercel-platform` | None; internal only | None |

`platform` builds the Next.js public export from the allowlisted public source in
`apps/platform`. Its package and lockfile install independently. Generated source
is ignored by Git. The shared export preparer also powers the existing Render
build. The original Cloudflare workspace remains unchanged.

## Runtime routing

The gateway preserves paths and queries, so `/docs/`, `/app/`, and `/_next/`
reach identical paths in the internal frontend. It rewrites internal redirects
to public paths and preserves upstream 404s. There is no path-prefix mount and
no client-facing internal hostname.

The `aurat` caller declares all four binding fields in root `vercel.json`.
Vercel injects `PLATFORM_URL` into gateway functions at runtime. Do **not** add it
manually to environment settings, expose it with `NEXT_PUBLIC_`, or use it in
build scripts or middleware. There are no bindings in the frontend because it
does not make server-to-server calls.

## What is available

- Landing page, docs, and read-only Scout example workspace.
- Same-domain navigation to public demo routes.
- Workspace links stay on the deployed domain at `/app/`.

This does **not** migrate Cloudflare D1 storage or trusted-header ChatGPT auth to
Vercel. The public export excludes API routes, database code, identity helpers,
environment files, and saved user data. The gateway only permits GET and HEAD,
and does not forward credentials or trusted identity headers. This prevents
the public export from impersonating a signed-in workspace.

## Manual import

1. Commit the reviewed change and import `8dazo/aurat`.
2. Set the project **Root Directory to `.`**, so Vercel reads root `vercel.json`.
3. Select **Services** and use configuration-defined service build settings.
4. Use Node 24.x. Do not retain the old project-level `npx next build` override.
5. Keep deployment protection enabled while validating the deployment.
6. Confirm the runtime binding is generated; do not enter `PLATFORM_URL` yourself.
7. Validate `/`, `/docs/`, `/app/?demo=1`, and
   `/app/runs/scout-fixed/?demo=1`, including images and Next assets.
8. Verify “Open workspace” stays on the deployed domain and opens `/app/`.

Run all services locally from the repository root:

```sh
npx vercel@62.1.0 dev -L
```

This automatically injects the runtime binding. Each service has its own
development command. The frontend preparer runs before Next.js starts.

Focused checks:

```sh
node --test services/vercel-gateway/index.test.mjs
cd apps/vercel-platform
pnpm install --frozen-lockfile
npm run build
```

References:
- https://vercel.com/docs/services
- https://vercel.com/docs/services/bindings
- https://vercel.com/docs/services/routing

The current `services` model preserves request paths; the older
`experimentalServices` model and its route-prefix stripping rules do not apply.

## Production domain

The repository requests `aurat.ai` as its production alias. Assignment requires
Vercel domain ownership verification and DNS pointing to the deployment. The
configuration does not change registrar DNS records. Confirm the domain is
assigned and its HTTPS certificate is ready before treating it as live.
