# Aurat platform — design and implementation decisions

## Product and evidence

Primary user: a developer reviewing whether an agent change is safe to merge. Primary task: select a project, open a failed run, identify the failed invariant and compare it to a passing baseline. The platform stores reports produced by the CLI. It does not execute arbitrary uploaded code or claim hosted agent execution.

The first external application is Scout. Its narration boundary accepts non-string summary/action and non-string why entries. Reproduce the existing defect with synthetic provider fixtures, fix the actual application module, and run the same suite in Scout CI. Describe this as a source-discovered defect, not an observed customer incident.

## Reference research

Selected from Seesaw.website: Linear, Browserbase, Raindrop. Download public HTML/CSS for analysis only; do not ship their source, fonts, trademarks or images.

- Linear: near-black editorial frame, restrained navigation, large left-aligned hero, generous top spacing, tangible product UI extending into the next section.
- Browserbase: thin grid rails, deliberate section dividers, a narrow benefits column paired with a larger demonstration surface, concise mono labels.
- Raindrop: quiet dark surfaces, vertical workflow steps and large product detail panel, visually distinct list/detail hierarchy.

Original visual thesis: a precision instrument for agent behavior. Charcoal surfaces, pearl text and sculptural replay objects; ice-cyan identifies interaction, peach identifies regression, green is reserved for pass. Real tables and trace evidence carry the dashboard. Imagery carries the marketing story and useful empty states.

## Tokens and shared components

| Component | Decision |
|---|---|
| Typography | System sans at 16px body; 14px controls; 12px secondary metadata. Monospace only for commands, identifiers and evidence. Hero 76–88px desktop, 44px mobile. |
| Layout | Landing max width 1240px, 48px desktop gutters, 20px mobile; sections divided by fine rails. Dashboard fixed 232px sidebar and 64px top bar, fluid content with 32px inset. |
| Palette | Canvas #101214; panels #171b1e; borders #30383d; pearl #eff2ee; secondary #9ca9ae; active #b9e8e4; failure #efb498. |
| Controls | Existing Shadcn button, dialog, sheet, select, table, tabs, sidebar, dropdown, empty and toast primitives. Visible focus, semantic labels and keyboard support. |
| Top bar | Breadcrumb/page label left; project context, documentation and import action right. No fake notification counter or decorative account controls. |
| Tables | Dense but readable 52px rows; status text + icon, never color alone; search and status filtering; empty and no-results states. |
| Details | Run summary then scenario list; selected scenario opens a sheet with assertions, coverage and sanitized events. JSON downloadable from same persisted report. |
| Motion | Short opacity/translate transitions, slow decorative hover only; prefers-reduced-motion disables animations. |
| Responsive | Sidebar becomes a Sheet; tables scroll inside their own container; detail panels fill viewport on mobile. |

## Pages and placement

| Route | First viewport and layout | Controls / data / states |
|---|---|---|
| `/` | 72px nav; left headline and primary demo CTA, sculpture at right; lower edge shows real report preview | Local demo link, docs, GitHub; no invented customer logos/metrics |
| Landing workflow | Three vertical step tabs left; actual capture/replay/verification panel right | Switch displayed step; three corresponding original objects |
| Landing evidence | Wide split comparison with code-derived failure excerpt and fracture artwork | Link to Scout regression proof and working dashboard demo |
| Landing integration | Compact command block and connection bridge illustration | Copy install command; view report workflow |
| Landing close | Wide quiet orbital illustration, concise CTA, footer | Open workspace / documentation |
| `/app` | Overview title, import action, four computed metrics; latest runs table; project setup panel | Metrics derive only from imported or explicitly labelled example data; empty workspace CTA |
| `/app/projects` | Project rows/cards with repository and latest run summary | New-project dialog (name, GitHub URL); select project context; durable save |
| `/app/runs` | Search + status filter above table | Columns: status, run, project, revision, scenarios, failures, imported time. Open detail; clear filters |
| `/app/runs/[id]` | Status/revision header, coverage strip, scenario table | Scenario detail sheet with failures/events/logs; download JSON; set passing run as baseline |
| `/app/scenarios` | Latest per-project scenario outcomes table | Columns: ID, project, status, model coverage, tool coverage; open originating run |
| `/app/fixtures` | Fixture coverage from reports, not raw secret payloads | Read-only model/tool interaction counts and incomplete scenarios; explicit fixture-source boundary |
| `/app/connections` | Project/repository connection state, report import, exact CI handoff | Import validated JSON to a project; copy GitHub artifact workflow. No fake OAuth or claimed background sync |
| `/app/settings` | Workspace identity and data handling guidance | Export data; preferences only where implemented; no fictitious billing/team administration |
| `/docs` | Sticky local contents and short readable integration guide | Clone/install, capture, assertions, export/import, limits, original repo links |

## Persistence and security

D1 stores projects, run metadata plus bounded report JSON, and passing baseline pointers. Every query includes the authenticated owner. Browser routes and write APIs require platform sign-in; anonymous users can view a clearly labelled sample dashboard. Writes validate ownership, content type, origin and report schema; 1 MiB maximum report size. Imported reports contain no runnable code. Existing redaction is applied again before storage; users are instructed to sanitize business data. No secrets are requested in the UI.

The initial connection is an actual report import tied to a repository/project. Automated CI upload needs an externally reachable authenticated ingestion service; the private preview does not pretend to provide this. Exportable GitHub workflow produces an artifact for import. Future GitHub OAuth, live execution, billing and team roles are excluded until backed by implementation.

## Asset map (10 original images)

hero-replay → hero; record-cassette/replay-loop/verify-gate → workflow; regression-fracture → evidence; evidence-stack → review section; connection-bridge → integration and connection setup; empty-runs → new workspace; empty-fixtures → fixture empty state; release-orbit → final CTA. Existing Aurat mark remains the navigation identity. Technical UI and charts stay live HTML, not generated screenshots.

## Verification

Prove original Scout defect fails and fixed source passes identical fixtures. Execute Scout CI and retain reports. Validate report imports, ownership and malformed payload rejection; verify create project, import, filtering, drilldown, baseline and download. Inspect desktop/mobile if managed browser preview is available. Validate build, migration, local assets and deployed status. Clearly separate sample data from persisted user runs.
