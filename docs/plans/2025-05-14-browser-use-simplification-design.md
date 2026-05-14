# Browser-Use Simplification Design

## Overview

Replace the entire custom Playwright-based auto-apply engine with **browser-use** + **CloakBrowser** + **OpenRouter**, and perform a full cleanup of engine, UI, and desktop cruft.

## What We're Removing

### Engine (delete entirely)
| File | Lines | Role |
|------|-------|------|
| `agents/universal.py` | 645 | Full state machine — detect, click, fill, submit |
| `agents/greenhouse.py` | ~150 | Legacy ATS-specific agent |
| `utils/human_input.py` | ~100 | Bezier curves, random typing delays |
| `utils/stealth.py` | 198 | Playwright CDP + stealth scripts |
| `utils/agent_browser.py` | ~80 | Rust CLI fallback (never invoked) |
| `models/job.py` | ~30 | Never imported |
| `notebooks/05_greenhouse_agent.py` | — | Broken, refs nonexistent function |

### Engine (dead code in surviving files)
- `models/application.py`: remove `ApplicationState`, `ApplicationPauseRequest`, `ApplicationResumeRequest`
- `memory/hybrid_store.py`: remove unused `field` import
- `api/routes.py`: remove `GreenhouseAgent` import + type union, `/install-browser` endpoint, Playwright imports
- `requirements.txt`: remove `playwright`, `playwright-stealth`, `ollama`
- `db/sqlite_schema.sql`: clean `match_score`, `snapshot_url`, `application_id`

### UI (delete entirely)
| File | Why |
|------|-----|
| `components/ManualIntervention.tsx` | Never imported |
| `components/PlaywrightSetup.tsx` | Never imported |
| `components/ui/tabs.tsx` | Never imported |
| `public/vercel.svg`, `next.svg`, `globe.svg`, `file.svg`, `window.svg` | Template leftovers |
| `generated/prisma/` | Never referenced by app code |

### UI (remove from package.json)
- `@neondatabase/serverless`
- `@prisma/adapter-neon`
- `@prisma/client`
- `next-themes` (no ThemeProvider)
- Move `shadcn` to devDependencies

### Desktop
- Hardcoded `CDP_PORT = 9222` and `remote-debugging-port` switch → configurable
- Review `dotenv.config()` in Electron

## What We're Adding

| Component | Role |
|-----------|------|
| `browser-use` package | AI browser automation framework |
| `cloakbrowser` package | Stealth browser launch (anti-detection) |
| `langchain-openai` (ChatOpenAI) | OpenRouter-compatible LLM client |
| `agents/aurat_agent.py` | Thin orchestrator: CloakBrowser → browser-use → QnA interception |
| `llm/openrouter.py` | ChatOpenAI wrapper configured for OpenRouter |
| `lib/constants.ts` | Shared `STAGE_ICONS`, `STATUS_COLORS`, `DetectResult` |
| `hooks/use-profile.ts` | Shared profile loading hook |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI (routes.py)                      │
│  POST /apply ──▶ AuratAgent(profile) ──▶ run()            │
│  POST /apply/detect ──▶ lightweight ATS detect (URL only)  │
│  POST /pause | /resume | /answer                            │
│  WS /ws/logs ──▶ ConnectionManager.broadcast_*            │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                   AuratAgent (agents/aurat_agent.py)        │
│                                                              │
│  1. Launch CloakBrowser(                                     │
│       headless=False, humanize=True,                        │
│       args=["--remote-debugging-port=9242",                 │
│             "--remote-debugging-address=127.0.0.1"])        │
│                                                              │
│  2. Pre-detect ATS platform (URL patterns only)             │
│     → builds system prompt context                          │
│                                                              │
│  3. Create browser-use Agent(                                │
│       task="<detailed instructions with profile data>",      │
│       llm=ChatOpenAI(                                       │
│         base_url="https://openrouter.ai/api/v1",           │
│         model=OPENROUTER_MODEL,                             │
│         api_key=OPENROUTER_API_KEY,                         │
│       ),                                                     │
│       browser_session=BrowserSession(                       │
│         cdp_url="http://127.0.0.1:9242"                     │
│       ),                                                     │
│     )                                                        │
│                                                              │
│  4. Run agent → intercept step events → broadcast to WS     │
│     When agent asks custom questions:                        │
│       a. Check hybrid QnA memory first                      │
│       b. If no match → pause → ask user → save answer       │
│                                                              │
│  5. Post-run: Profile enrichment from Q&A facts             │
│                                                              │
│  6. Notify Electron to detach agent view                     │
│     Close CloakBrowser                                       │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│              CloakBrowser + Electron Preview                 │
│                                                              │
│  CloakBrowser (headless=False, humanize=True)               │
│  ├─ CDP on port 9242 (for browser-use Agent)               │
│  └─ Electron BrowserPreview connects to this CDP port      │
│     for live browser view during apply                       │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

1. **Orchestration wrapper keeps QnA memory** — browser-use agent handles navigation + form filling, but our orchestrator intercepts custom questions and does QnA lookup before pausing for user input.

2. **ATS detection stays (simplified)** — Keep `_ATS_SIGNALS` URL patterns only (no DOM selectors) to provide context to the LLM system prompt. The LLM agent handles all DOM interaction.

3. **Pre-flight `/apply/detect` stays** — Still useful for the UI banner, but simplified to URL-pattern-only ATS detection (fast, no browser needed).

4. **Electron preview connects to CloakBrowser CDP** — CloakBrowser launches with `--remote-debugging-port=9242`, Electron's BrowserPreview connects to this port for the live view.

5. **Model configurable** — Default `liquid/lfm-2.5-1.2b-thinking:free`, configurable in Settings via OpenRouter model string. Settings page gets an OpenRouter section replacing Ollama.

6. **Pause/Resume/Answer flow preserved** — The orchestrator wraps browser-use's step callbacks. When a custom question is detected, pause the agent and wait for user input via `/answer`.

## Engine Changes Detail

### New: `agents/aurat_agent.py`
- Launches CloakBrowser
- Creates browser-use Agent with OpenRouter LLM
- Builds system prompt from profile + ATS context
- Intercepts agent steps, broadcasts to WebSocket
- Checks hybrid QnA memory for custom questions
- Pause/resume/answer mechanism for human-in-the-loop
- Post-run profile enrichment

### New: `llm/openrouter.py`
- `ChatOpenAI` wrapper configured for OpenRouter
- Default model: `liquid/lfm-2.5-1.2b-thinking:free`
- API key from env var `OPENROUTER_API_KEY`
- Used by browser-use agent via LangChain integration

### Modified: `agents/base.py`
- Simplify to pause/resume/log only
- Remove abstract methods `detect_form_fields`, `fill_field`, `submit`
- Remove Playwright import
- Keep `run()` as abstract method

### Modified: `agents/detector.py`
- Strip to URL-pattern-only ATS detection
- Remove all DOM selector checks and Playwright Page dependency
- Keep `PageContext` dataclass but simplify (no `apply_button_selector`)
- Make `detect_ats_platform(url: str) -> ATS_PLATFORM` work without a Page object
- Remove `detect_page_type` and `APPLY_BUTTON_SELECTORS` entirely

### Modified: `api/routes.py`
- Remove Playwright imports
- Remove `/install-browser` endpoint
- Remove `GreenhouseAgent` import and type annotation
- Update `/apply` to use `AuratAgent`
- Update `/apply/detect` to use simplified URL-only ATS detection
- Remove `_active_page` global
- Keep `/pause`, `/resume`, `/answer` endpoints
- Add `/browser/status` endpoint for CloakBrowser health check

### Modified: `requirements.txt`
- Remove: `playwright`, `playwright-stealth`, `ollama`
- Add: `browser-use`, `cloakbrowser`, `langchain-openai`

### Modified: `llm/client.py`
- Replace Ollama with OpenRouter-backed client
- Keep `extract_structured()` and `complete()` interfaces for memory/profile enrichment
- Backed by `ChatOpenAI` with OpenRouter base URL

### Modified: `llm/prompts.py`
- Remove `FIELD_MAP_PROMPT` (browser-use agent handles field mapping)
- Keep `EXTRACT_RESUME_PROMPT` and `MATCH_JD_PROMPT` (still used by parsers)

## UI Changes Detail

### New: `lib/constants.ts`
- Export `STAGE_ICONS`, `STATUS_COLORS`, `DetectResult` type

### New: `hooks/use-profile.ts`
- Shared `useProfile()` hook replacing duplicated loading logic

### Modified: `app/settings/page.tsx`
- Replace Ollama config with OpenRouter (API key + model selector)
- Rename "Playwright Browser" card to "Browser"
- Add CloakBrowser status check instead of Playwright install
- Persist settings to backend via `electronAPI` instead of `localStorage`

### Modified: `components/ControlPanel.tsx`
- Import `STAGE_ICONS`, `STATUS_COLORS`, `DetectResult` from shared constants
- Remove local definitions
- Use `useProfile()` hook

### Modified: `components/BrowserPreview.tsx`
- Import `AgentStatus` from `use-agent-ws.ts`
- Remove local `type AgentStatus` definition
- Connect to CloakBrowser CDP port (9242) instead of Playwright

### Modified: `components/ApplyDetectBanner.tsx`
- Use `electronAPI` wrapper instead of `(window as any).electronAPI`
- Remove eslint-disable comments
- Import `DetectResult` from shared constants

### Modified: `lib/use-agent-ws.ts`
- Make `WS_URL` configurable via env var

## Desktop Changes Detail

### Modified: `main.ts`
- Make CDP port configurable (CloakBrowser manages its own port)
- Remove hardcoded `remote-debugging-port` switch if CloakBrowser handles it
- Review dotenv necessity

## Cruft Cleanup (Engine)

- Delete all `__pycache__/` directories
- Delete `.browser_use_inspect/` directory (65MB)
- Remove `import socket` from `stealth.py` (will be deleted anyway)
- Remove `from dataclasses import field` from `hybrid_store.py`
- Fix inline `urllib.parse` import in `jobs_client.py`
- Fix compound `import os, json, asyncio` in `llm/client.py`
- Make `~/.aurat` resume dir configurable via env var
- Make 10MB file limit a named constant
- Make `all-MiniLM-L6-v2` embedding model configurable via env var
- Remove `match_score`, `snapshot_url`, `application_id` from DB schema or wire them up
- Fix `_active_page` module-level mutable state in `routes.py`

## Cruft Cleanup (UI)

- Extract shared constants to `lib/constants.ts`
- Create `hooks/use-profile.ts` for shared profile loading
- Fix `ApplyDetectBanner.tsx` to use `electronAPI` wrapper
- Import `AgentStatus` from shared module in `BrowserPreview.tsx`
- Narrow `HistoryDetail.status` type from `string`
- Align default ATS type to `"generic"` everywhere
- Centralize API endpoint paths in a constants file
- Make version number come from `package.json`
- Remove hardcoded `localStorage` key — use `electronAPI` for persistence
- Replace inline SVGs with lucide-react icons where practical
- Add or remove `ThemeProvider` for `next-themes` (decide: either wire it up properly or remove it)