# Fix In-App Browser Preview Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the broken in-app browser preview so the Playwright-controlled headless browser renders inside the Electron app via CDP screencast, with no external browser window.

**Architecture:** Playwright runs headless with `--remote-debugging-port`. Electron's main process creates a `WebContentsView` that loads `browser-view.html`, which connects to CDP via WebSocket, renders screencast frames on a canvas, and forwards mouse/keyboard input. The React `BrowserPreview` component attaches/detaches this view and shows status overlays.

**Tech Stack:** Electron 34+ WebContentsView, Playwright CDP, Chrome DevTools Protocol screencast, React canvas rendering

---

## Root Cause Analysis

The logs show `[browser:attach] Found CDP target` and `WebContentsView added to window`, but no preview renders. The bugs:

1. **`browser-view.html` uses `fetch()` from `file://` origin** to `http://localhost:PORT/json` — even with `webSecurity: false`, this can be blocked by Chromium's CORS policy for `file://` origins in WebContentsView.
2. **Canvas CSS sizing without explicit dimensions** — `width: 100%; height: 100%` with `marginTop` causes zero-height rendering.
3. **`did-finish-load` race condition** — `browserView` could be null by the time the page loads.
4. **`_cdp_port` never cleared in `routes.py` finally block** — stale port info.
5. **`headless=True` may not support screencast** — need `headless="new"`.

---

### Task 1: Fix browser-view.html — Remove fetch, receive WS URL directly

**Files:**
- Modify: `desktop/browser-view.html`

**Step 1:** Replace `connectCDP()` that does `fetch()` with `connectDirect(wsUrl)` that receives the WebSocket URL directly. Remove the `fetch()` call entirely. `window.__startCDP` now takes a WebSocket URL string, not a port number.

**Step 2:** Fix canvas layout — remove `marginTop` JS hack, use CSS `position: absolute; top: 28px; left: 0; right: 0; bottom: 0;` and add `ResizeObserver` for explicit pixel sizing.

---

### Task 2: Fix main.ts — Pass WebSocket URL directly, not CDP port

**Files:**
- Modify: `desktop/main.ts`

**Step 1:** In `attachBrowserView()`, after discovering the CDP target via `fetch(http://localhost:${cdpPort}/json)`, extract `webSocketDebuggerUrl` and pass that URL string to `browser-view.html` via `executeJavaScript(`window.__startCDP('${wsUrl}')`)` instead of passing just the port number.

This moves the fetch from the renderer (file://) to the main process (Node.js), avoiding CORS issues.

---

### Task 3: Fix routes.py — Clear _cdp_port in finally block

**Files:**
- Modify: `engine/api/routes.py`

**Step 1:** Add `_cdp_port = None` in the `finally` block of `run_agent()`.

---

### Task 4: Fix stealth.py — Use headless="new"

**Files:**
- Modify: `engine/utils/stealth.py`

**Step 1:** Change `headless=True` to `headless="new"`. The new headless mode supports CDP screencast properly.

---

### Task 5: Clean up BrowserPreview.tsx — Remove duplicate pause/resume

**Files:**
- Modify: `ui/components/BrowserPreview.tsx`

**Step 1:** Remove `handlePause`, `handleResume`, and their button JSX. ControlPanel already has these controls.

---

### Task 6: Remove dead BrowserStatus.tsx

**Files:**
- Delete: `ui/components/BrowserStatus.tsx`

**Step 1:** `rm ui/components/BrowserStatus.tsx` and verify no imports remain.

---

### Task 7: End-to-end verification

**Step 1:** Rebuild all projects.
**Step 2:** Start app, upload resume, go to Jobs, click Apply, click Start.
**Step 3:** Verify browser preview appears in left panel showing the job page.