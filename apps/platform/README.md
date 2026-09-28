# Aurat Platform

A private workspace for agent regression evidence, plus the Aurat landing page.

## What works

- Ten original brand images and a responsive, researched landing page.
- A clearly labelled, read-only Scout reproduction: original source passes 1/4 scenarios; the validation fix passes 4/4.
- Signed-in projects, report import, scenario evidence, fixture coverage, passing baselines, and JSON export.
- Owner-scoped SQLite/D1 persistence, validated reports, bounded request bodies, and redaction before storage.

The connection is report import from local runs or CI artifacts. There is no GitHub OAuth, automatic ingestion, hosted agent execution, team administration, or billing yet. This is a developer preview, not a claim of enterprise readiness.

## Development

Node 22.13+ and pnpm 11.25.0 are required.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm typecheck
pnpm build
```

The app uses React 19, Vinext/Next routing, Tailwind, Shadcn primitives, and D1. The Sites runtime supplies trusted identity headers and the DB binding. Direct public deployment without that authentication boundary is unsupported. The starter's local development identity is synthetic; tests never use deployed data.

Generate migrations after changing `db/schema.ts` with `pnpm db:generate`. Deploy migrations with the application. Preserve `.openai/hosting.json` for the existing Site. Source hosting and runtime configuration are separate from the Aurat CLI package.

## Design and proof

- [Design decisions and page plan](docs/DESIGN-DECISIONS.md)
- [Seesaw reference research](docs/REFERENCE-RESEARCH.md)
- [Image prompts and provenance](docs/ASSET-PROMPTS.json)
- [Verification](docs/VERIFICATION.md)
- [Scout regression PR](https://github.com/8dazo/scout/pull/2)

Public website HTML/CSS was downloaded only for research. The shipped interface, copy and images are original. WebP derivatives retain the generated artwork while reducing all eleven image files from roughly 12 MB to 0.85 MB.
