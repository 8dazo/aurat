# Native Browser Rendering — Design

**Goal:** Replace the CDP screencast canvas with native Electron Chromium rendering. The browser preview should look identical to a real browser window — pixel-perfect, Retina-aware, dynamically sized.

**Architecture:** Electron owns the Chromium instance. Playwright connects to it via `connectOverCDP`. The `WebContentsView` renders the page natively. No canvas, no frame streaming, no JPEG compression.

**Tech Stack:** Electron WebContentsView, Playwright connectOverCDP, playwright stealth scripts via addInitScript

---

## Current Flow (Blurry)

```
Python: create_stealth_browser() → headless Chromium (separate process)
                                    ↓ CDP WebSocket (JPEG frames)
Electron: WebContentsView → browser-view.html → canvas (blurry, lossy)
```

## New Flow (Native)

```
Electron: launches with --remote-debugging-port=9222
          ┌──────────────────────────────────────┐
          │  BrowserWindow (Next.js UI)           │
          │                                       │
          │  ┌─────────────────────────────────┐│
          │  │ BrowserPreview WebContentsView    ││
          │  │ (renders page NATIVELY)           ││
          │  └─────────────────────────────────┘│
          │                                       │
          │  Chromium instance with CDP on :9222  │
          └──────────────────────────────────────┘
                    ↑ WebSocket (CDP commands)
                    │
Python:  playwright.chromium.connectOverCDP(wsUrl)
         → operates on Electron's Chromium directly
         → stealth via addInitScript
```

---

## Changes Per File

### 1. `desktop/main.ts` — Major rewrite

**Remove:** `browser-view.html` loading, `__startCDP` injection, CDP WebSocket connection via browser-view.html

**Add:**
- Electron launches with `--remote-debugging-port=<dynamic_port>` (find free port on startup)
- Store `cdpPort` globally, expose via IPC handler `browser:getCdpPort`
- `attachBrowserView(url)` creates a `WebContentsView` and calls `loadURL(url)` — renders the page natively
- When Python broadcasts the page URL via WebSocket, Electron sets the WebContentsView URL
- `resizeBrowserView()` stays the same (adjusts WebContentsView bounds on window resize)
- Remove all `browser-view.html` references and CDP WebSocket logic

**New IPC handlers:**
- `browser:getCdpPort` → returns the CDP port Electron is using
- `browser:navigatePreview` → WebContentsView loads a URL
- `browser:attach(url)` → creates WebContentsView, loads URL
- `browser:detach` → removes WebContentsView (same as now)

### 2. `desktop/browser-view.html` — DELETE

No longer needed. All rendering is native Chromium via WebContentsView.

### 3. `engine/utils/stealth.py` — Replace `create_stealth_browser` with `connect_to_electron`

**Remove:** `create_stealth_browser()` that launches a separate Chromium process

**Add:** `connect_to_electron(cdp_url)`:
```python
async def connect_to_electron(cdp_url: str):
    pw = await async_playwright().start()
    browser = await pw.chromium.connect_over_cdp(cdp_url)
    context = browser.contexts[0] if browser.contexts else await browser.new_context(
        viewport={"width": 1280, "height": 800},
        user_agent="Mozilla/5.0 ..."
    )
    # Apply stealth via addInitScript instead of Stealth.apply_stealth_async
    await apply_stealth_scripts(context)
    page = context.pages[0] if context.pages else await context.new_page()
    return pw, browser, context, page
```

**Add:** `apply_stealth_scripts(context)` that injects key stealth scripts:
- navigator.webdriver removal
- chrome.runtime mock
- permissions query override
- plugins mock
- WebGL vendor override

### 4. `engine/api/routes.py` — Get CDP endpoint from Electron

**Modify `run_agent()`:**
- Before creating browser, call Electron API to get CDP WebSocket URL
- Use `connect_to_electron(cdp_url)` instead of `create_stealth_browser()`
- Remove `_cdp_port` — no longer needed since Python doesn't own the browser
- Broadcast `page_url` instead of `cdp_port` via WebSocket

**Add endpoint:** `GET /electron-cdp-url` → queries Electron for the CDP URL (or Python calls Electron directly)

### 5. `ui/components/BrowserPreview.tsx` — Simplify

**Remove:** CDP port detection logic, `electronAPI.browser.attach(cdpPort)`

**Add:** 
- Listen for `page_url` from WebSocket (instead of `cdp_port`)
- Call `electronAPI.browser.attachUrl(pageUrl)` when page URL is received
- Call `electronAPI.browser.detach()` when status goes to Idle

### 6. `ui/lib/electron-api.ts` — Update IPC methods

**Remove:** `browser.attach(cdpPort)` 

**Add:**
- `browser.attachUrl(url: string)` → IPC to `browser:attach` with URL
- `browser.getCdpUrl()` → IPC to `browser:getCdpUrl` (for Python to connect)

### 7. `desktop/preload.ts` — Update IPC bridge

**Remove:** `browser.attach(cdpPort)`

**Add:**
- `browser.attachUrl(url)` → `ipcRenderer.invoke('browser:attach', url)`
- `browser.getCdpUrl()` → `ipcRenderer.invoke('browser:getCdpUrl')`

### 8. `desktop/tsconfig.json` / build config — Remove browser-view.html

Remove `browser-view.html` from the build copy step.

---

## Communication Flow

1. Electron starts with `--remote-debugging-port=9222`
2. User clicks "Start" → React calls `/apply` with job_url
3. Python calls `GET http://localhost:18732/electron-cdp-url` → Electron returns `ws://127.0.0.1:9222/devtools/browser/...`
4. Python connects via `playwright.chromium.connect_over_cdp(wsUrl)`
5. Python applies stealth scripts, navigates to job_url
6. Python broadcasts `page_url=<url>` via WebSocket
7. React BrowserPreview receives `page_url`, calls `electronAPI.browser.attachUrl(url)`
8. Electron creates WebContentsView, loads the URL natively
9. Page renders pixel-perfect — same Chromium, native rendering

Wait — step 3 has a chicken-and-egg problem. Python calls Electron, but Electron's CDP URL is just `ws://127.0.0.1:9222/devtools/browser/<id>`. Python needs this to connect.

Actually, it's simpler: since Electron starts with `--remote-debugging-port=9222`, the CDP endpoint is deterministic: `http://127.0.0.1:9222/json` returns the targets. Python can just hit this URL directly.

But the port needs to be known. Simplest: Electron picks a port, writes it to a file or passes it to Python, or Python queries an Electron HTTP endpoint.

**Simplest approach:** Electron exposes a small HTTP endpoint that returns its CDP WebSocket URL. Python calls this before connecting.

Or even simpler: Electron starts the Python process, so it can pass the CDP port as an environment variable or command-line argument.

---

## Stealth Scripts

Key stealth patches to apply via `context.add_init_script()`:

```javascript
// 1. Remove navigator.webdriver
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

// 2. Mock chrome.runtime  
window.chrome = { runtime: {} };

// 3. Override permissions.query
const originalQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (parameters) => (
  parameters.name === 'notifications' ? 
    Promise.resolve({ state: Notification.permission }) : 
    originalQuery(parameters)
);

// 4. Mock plugins
Object.defineProperty(navigator, 'plugins', {
  get: () => [1, 2, 3, 4, 5],
});

// 5. Mock languages
Object.defineProperty(navigator, 'languages', {
  get: () => ['en-US', 'en'],
});
```

These cover the most common bot detection checks. More can be added from the playwright-stealth source.

---

## What Gets Deleted

- `desktop/browser-view.html` — entirely (canvas + CDP screencast code)
- `_cdp_port` tracking in `routes.py`
- CDP WebSocket connection logic in `browser-view.html`
- CDP port detection in `BrowserPreview.tsx`
- `Page.startScreencast` / `Page.screencastFrame` / frame rendering

## What Stays the Same

- `BrowserPreview.tsx` status overlay logic (Idle/Running/Paused badges)
- `ControlPanel.tsx` (start/pause/resume controls)
- `GreenhouseAgent` automation logic (detect_fields, map_fields, fill_field, submit)
- WebSocket for status/log notifications
- `resizeBrowserView()` in main.ts
- Python backend API structure