# Aurat.AI — Project Progress & Plan

## Current State

Aurat is a desktop app (Electron + Next.js UI + Python FastAPI engine) that automates job applications. Core features are built:

- ✅ Resume upload & profile extraction (PDF → LLM → MasterProfile)
- ✅ Job browsing/search with external API
- ✅ Job analysis/match scoring via LLM
- ✅ Greenhouse ATS automated form filling (agent with human-like typing)
- ✅ Real-time browser screencast via CDP WebSocket
- ✅ Manual intervention (pause/resume/answer questions)
- ✅ Profile editing
- ✅ Application history table
- ✅ Settings (LLM config, DB status, Playwright)
- ✅ Dual Ollama LLM (local + cloud fallback)

## Completed in This Session

### HIGH
1. ✅ **Wire up Auto-Apply button** — JobAnalyzer "Auto-Apply" now navigates to `/apply?url=...&title=...&company=...&ats_type=...`. ApplyPage reads search params via `useSearchParams()` and passes context to ControlPanel. Uses Suspense boundary for Next.js compatibility.

2. ✅ **Fix ControlPanel.handleStart** — Now receives `jobUrl`, `jobTitle`, `jobCompany`, `atsType`, and `profile` as props. Sends real data to `/apply` endpoint. Displays job info in the panel header. Validates that job URL and profile exist before starting.

### MEDIUM
3. ✅ **Save application results to history** — The `/apply` route now saves history on both agent success (`completed`) and failure (`failed`), with job title, company, steps log, and custom questions. Updated `ApplicationStartRequest` to include `job_title` and `job_company`.

4. ✅ **Q&A memory display** — Added a "Custom Q&A Memory" section to ProfileEditor that shows entries from `custom_qna_memory` with delete buttons.

### LOW
5. ✅ **Fix camelCase/snake_case drift** — History page now consistently uses snake_case from the API response and maps to camelCase once.

6. ✅ **Error handling UI** — Added `toast.error()` calls to all previously empty catch blocks in ControlPanel (start/pause/resume), ApplyPage (submit answer/resume), and Settings (LLM test, Playwright check/install). Added validation in handleStart for missing job URL or profile.

## Remaining Work

### LOW
7. ⏳ **Sync LLM settings from UI to Python engine** — Settings currently saved in `localStorage` only. Need to add a `/settings` endpoint to the Python engine that accepts `api_key` and `model` params, and update `LLMClient` to support runtime config updates instead of only env vars. This requires:
   - New `/settings` GET/POST endpoints in `engine/api/routes.py`
   - Update `LLMClient` to support `configure()` method for runtime API key/model changes
   - Hook up the Settings page's "Save" button to also POST to `/settings`
   - Use Electron IPC to proxy the settings to the Python backend

## Files Changed

- `ui/components/JobAnalyzer.tsx` — Auto-Apply button now uses `useRouter` to navigate to `/apply` with job params
- `ui/app/apply/page.tsx` — Reads `useSearchParams()`, passes job context to ControlPanel+profile from DB
- `ui/components/ControlPanel.tsx` — Accepts job context props, validates before start, shows job info header, toast errors
- `ui/components/ProfileEditor.tsx` — Added Q&A memory card section
- `ui/app/history/page.tsx` — Fixed snake_case/camelCase mapping
- `ui/app/settings/page.tsx` — Added toast error notifications
- `engine/models/application.py` — Added `job_title` and `job_company` fields
- `engine/api/routes.py` — Save history on agent completion/failure, pass job context