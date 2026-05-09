# Native Browser Rendering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace CDP screencast canvas rendering with native Electron Chromium rendering via Playwright connectOverCDP.

**Architecture:** Electron owns the Chromium instance (launched with `--remote-debugging-port`). Python connects via Playwright's `connectOverCDP` to automate the same browser. The `WebContentsView` renders the page natively — no canvas, no frame streaming, no JPEG compression. Stealth patches are applied via `addInitScript`.

**Tech Stack:** Electron 34+ WebContentsView, Playwright Python `connect_over_cdp`, context.add_init_script for stealth

---

### Task 1: Expose CDP port from Electron and add IPC handlers

**Files:**
- Modify: `desktop/main.ts`

**Step 1: Find a free port and pass --remote-debugging-port to Electron**

Add a `findFreePort()` utility (using Node.js `net` module) and add `--remote-debugging-port` to Electron's command line switches. Store the CDP port globally.

```typescript
// At the top of main.ts, add:
import * as net from 'net'

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as net.AddressInfo).port
      server.close(() => resolve(port))
    })
    server.on('error', reject)
  })
}

let cdpPort: number | null = null
```

In `app.whenReady()`, before creating the window:

```typescript
app.whenReady().then(async () => {
  registerIpcHandlers()
  cdpPort = await findFreePort()
  app.commandLine.appendSwitch('remote-debugging-port', String(cdpPort))

  ipcMain.handle('browser:getCdpPort', () => cdpPort)

  // ... rest of existing code ...
})
```

**Step 2: Add IPC handler for `browser:getCdpPort`**

Already added in Step 1. Also expose via HTTP for Python to query:

```typescript
// After waitForPython(), start a small HTTP server for Python to get the CDP port
let httpServer: import('http').Server | null = null

function startInfoServer() {
  const http = require('http')
  httpServer = http.createServer((req: any, res: any) => {
    if (req.url === '/cdp-info') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ cdp_port: cdpPort }))
    } else {
      res.writeHead(404)
      res.end()
    }
  })
  httpServer.listen(18733, '127.0.0.1')
}
```

Call `startInfoServer()` in `app.whenReady()`.

**Step 3: Rewrite `attachBrowserView` to accept a URL instead of CDP port**

Replace the current `attachBrowserView(cdpPort)` with `attachBrowserView(url: string)`:

```typescript
async function attachBrowserView(url: string): Promise<{ status: string; error?: string }> {
  if (!mainWindow) {
    return { status: 'error', error: 'No main window' }
  }

  detachBrowserView()

  browserView = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  const bv = browserView
  bv.webContents.loadURL(url)

  return new Promise((resolve) => {
    bv.webContents.on('did-finish-load', () => {
      if (browserView !== bv) {
        resolve({ status: 'error', error: 'Browser view was replaced' })
        return
      }
      resolve({ status: 'attached' })
    })

    bv.webContents.on('render-process-gone', (_event, details) => {
      if (browserView === bv) {
        detachBrowserView()
      }
    })

    mainWindow!.contentView.addChildView(bv)
    resizeBrowserView()
  })
}
```

**Step 4: Update detachBrowserView — remove CDP stop call**

```typescript
function detachBrowserView() {
  if (!browserView) return
  if (mainWindow) {
    try {
      mainWindow.contentView.removeChildView(browserView)
    } catch {}
  }
  browserView = null
}
```

**Step 5: Remove `browser-view.html` loading and CDP WebSocket logic**

Remove all references to `browser-view.html`, `__startCDP`, `__stopCDP`, `wsUrl`, CDP target discovery (`fetch(http://127.0.0.1:${cdpPort}/json)`).

**Step 6: Update IPC handlers**

Change `browser:attach` to accept a URL string:

```typescript
ipcMain.handle('browser:attach', async (_event, url: string) => {
  return await attachBrowserView(url)
})
```

**Step 7: Build and verify**

Run: `cd desktop && npm run build`

**Step 8: Commit**

```bash
git add desktop/main.ts
git commit -m "feat: expose CDP port, URL-based browser view attach, remove CDP screencast"
```

---

### Task 2: Delete browser-view.html and update build config

**Files:**
- Delete: `desktop/browser-view.html`
- Modify: `desktop/package.json` (if it copies browser-view.html)

**Step 1: Delete browser-view.html**

```bash
rm desktop/browser-view.html
```

**Step 2: Check and update build scripts**

Check `desktop/package.json` for any build step that copies `browser-view.html`. The current build script is `tsc && cp browser-view.html dist/`. Update it to just `tsc`:

```json
{
  "scripts": {
    "build": "tsc"
  }
}
```

**Step 3: Build and verify**

Run: `cd desktop && npm run build`

**Step 4: Commit**

```bash
git add -A desktop/
git commit -m "feat: delete browser-view.html, remove from build"
```

---

### Task 3: Rewrite stealth.py — connectOverCDP instead of launching browser

**Files:**
- Modify: `engine/utils/stealth.py`

**Step 1: Replace `create_stealth_browser` with `connect_to_electron`**

```python
import random
import socket
import httpx
from playwright.async_api import async_playwright

VIEWPORTS = [
    {"width": 1280, "height": 800},
    {"width": 1366, "height": 768},
    {"width": 1440, "height": 900},
    {"width": 1536, "height": 864},
    {"width": 1920, "height": 1080},
]

STEALTH_SCRIPT = """
// Remove navigator.webdriver
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

// Mock chrome.runtime
if (!window.chrome) {
  window.chrome = { runtime: {} };
}

// Override permissions.query
const originalQuery = window.navigator.permissions.query.bind(window.navigator.permissions);
window.navigator.permissions.query = (parameters) => (
  parameters.name === 'notifications'
    ? Promise.resolve({ state: Notification.permission })
    : originalQuery(parameters)
);

// Mock plugins
Object.defineProperty(navigator, 'plugins', {
  get: () => [1, 2, 3, 4, 5],
});

// Mock languages
Object.defineProperty(navigator, 'languages', {
  get: () => ['en-US', 'en'],
});
"""


async def get_electron_cdp_url(port: int = 18733) -> str:
    """Get the CDP WebSocket URL from Electron's info server."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"http://127.0.0.1:{port}/cdp-info")
        data = resp.json()
        cdp_port = data["cdp_port"]

    async with httpx.AsyncClient() as client:
        resp = await client.get(f"http://127.0.0.1:{cdp_port}/json")
        targets = resp.json()
        browser_target = next(
            (t for t in targets if t["type"] == "page"), targets[0]
        )
        return browser_target["webSocketDebuggerUrl"]


async def connect_to_electron(cdp_url: str):
    """Connect Playwright to Electron's Chromium instance via CDP."""
    pw = await async_playwright().start()
    browser = await pw.chromium.connect_over_cdp(cdp_url)

    context = browser.contexts[0] if browser.contexts else await browser.new_context(
        viewport=VIEWPORTS[0],
        user_agent=(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/136.0.0.0 Safari/537.36"
        ),
    )

    await context.add_init_script(STEALTH_SCRIPT)

    page = context.pages[0] if context.pages else await context.new_page()

    return pw, browser, context, page


# Keep existing functions for backward compatibility / health checks
async def check_browser_installed() -> str | None:
    try:
        from playwright._impl._driver import compute_driver_executable
        import subprocess

        driver_executable = compute_driver_executable()
        if isinstance(driver_executable, tuple):
            node_path, cli_path = driver_executable
            cmd = [node_path, cli_path]
        else:
            cmd = [str(driver_executable)]
        result = subprocess.run(
            cmd + ["install", "--dry-run", "chromium"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            return "chromium"
        return None
    except Exception:
        return None


async def install_browser() -> dict:
    try:
        from playwright._impl._driver import compute_driver_executable
        import subprocess

        driver_executable = compute_driver_executable()
        if isinstance(driver_executable, tuple):
            node_path, cli_path = driver_executable
            cmd = [node_path, cli_path]
        else:
            cmd = [str(driver_executable)]
        result = subprocess.run(
            cmd + ["install", "chromium"],
            capture_output=True,
            text=True,
            timeout=300,
        )
        if result.returncode == 0:
            return {"status": "installed", "browser": "chromium"}
        return {"status": "error", "message": result.stderr or result.stdout}
    except Exception as e:
        return {"status": "error", "message": str(e)}
```

**Step 2: Verify import works**

Run: `cd engine && .venv/bin/python -c "from utils.stealth import connect_to_electron, get_electron_cdp_url; print('import ok')"`

**Step 3: Commit**

```bash
git add engine/utils/stealth.py
git commit -m "feat: connect_to_electron via CDP, stealth via addInitScript"
```

---

### Task 4: Update routes.py to use connect_to_electron

**Files:**
- Modify: `engine/api/routes.py`

**Step 1: Update imports**

Replace `create_stealth_browser` import with `connect_to_electron, get_electron_cdp_url`:

```python
from utils.stealth import (
    connect_to_electron,
    get_electron_cdp_url,
    check_browser_installed,
    install_browser,
)
```

**Step 2: Update run_agent function**

The `run_agent` inner function in `start_application` needs to:
1. Call `get_electron_cdp_url()` to get the WebSocket URL
2. Use `connect_to_electron(cdp_url)` instead of `create_stealth_browser()`
3. Broadcast `page_url` instead of `cdp_port`
4. Remove `_cdp_port` tracking

Key changes in `run_agent()`:

```python
async def run_agent():
    global _active_agent, _agent_task, _active_page
    logger.info("run_agent: connecting to Electron CDP...")
    try:
        cdp_url = await get_electron_cdp_url()
    except Exception as e:
        logger.exception("run_agent: failed to get CDP URL from Electron: %s", e)
        await manager.broadcast_log(
            "browser", "error", f"electron_cdp_failed: {e}"
        )
        await manager.broadcast_status("Idle")
        _active_agent = None
        _agent_task = None
        return

    try:
        pw, browser, context, page = await connect_to_electron(cdp_url)
    except Exception as e:
        logger.exception("run_agent: failed to connect to Electron: %s", e)
        await manager.broadcast_log(
            "browser", "error", f"browser_connect_failed: {e}"
        )
        await manager.broadcast_status("Idle")
        _active_agent = None
        _agent_task = None
        return

    _active_page = page
    await page.goto("about:blank")
    await manager.broadcast_log("browser", "started", f"page_url=about:blank")
    try:
        logger.info("run_agent: navigating to %s", job_url)
        await manager.broadcast_log(
            "navigation", "running", f"Navigating to {job_url}"
        )
        await page.goto(job_url, wait_until="networkidle", timeout=30000)
        logger.info("run_agent: page loaded")

        current_url = page.url
        await manager.broadcast_log("browser", "navigated", f"page_url={current_url}")
        await manager.broadcast_log("navigation", "completed", "Page loaded")

        if _active_agent:
            _active_agent.on_step = lambda step, status, detail="": (
                asyncio.ensure_future(manager.broadcast_log(step, status, detail))
            )
        await manager.broadcast_status("Running")
        if _active_agent:
            await _active_agent.run(page)
        # ... rest of success/error handling same as before
    except Exception as e:
        # ... error handling same as before
    finally:
        _active_agent = None
        _agent_task = None
        _active_page = None
        # Don't close browser — it's Electron's browser!
        try:
            await pw.stop()
        except Exception:
            pass
```

**Step 3: Remove _cdp_port global and cdp-info endpoint**

Remove `_cdp_port: int | None = None` from module globals. Remove the `get_cdp_info` endpoint. The `/cdp-info` endpoint is no longer needed since Electron provides CDP info directly.

**Step 4: Commit**

```bash
git add engine/api/routes.py
git commit -m "feat: use connect_to_electron, broadcast page_url instead of cdp_port"
```

---

### Task 5: Update BrowserPreview.tsx and electron-api.ts

**Files:**
- Modify: `ui/components/BrowserPreview.tsx`
- Modify: `ui/lib/electron-api.ts`
- Modify: `desktop/preload.ts`

**Step 1: Update electron-api.ts**

Replace `browser.attach(cdpPort)` with `browser.attachUrl(url)`:

```typescript
// In electron-api.ts, browser section:
browser: {
  attachUrl: async (url: string): Promise<{ status: string; error?: string }> => {
    if (typeof window !== 'undefined' && window.electronAPI?.browser?.attachUrl) {
      return window.electronAPI.browser.attachUrl(url)
    }
    return { status: 'unavailable' }
  },
  detach: async (): Promise<{ status: string }> => {
    if (typeof window !== 'undefined' && window.electronAPI?.browser?.detach) {
      return window.electronAPI.browser.detach()
    }
    return { status: 'unavailable' }
  },
},
```

**Step 2: Update preload.ts**

Replace `browser.attach` with `browser.attachUrl`:

```typescript
browser: {
  attachUrl: (url: string) => ipcRenderer.invoke('browser:attach', url),
  detach: () => ipcRenderer.invoke('browser:detach'),
},
```

**Step 3: Update BrowserPreview.tsx**

Replace CDP port detection with page URL detection:

```typescript
"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useAgentWs } from "@/lib/use-agent-ws"
import { electronAPI } from "@/lib/electron-api"
import { Badge } from "@/components/ui/badge"
import { Monitor } from "lucide-react"

type AgentStatus = "Idle" | "Running" | "Paused"

export function BrowserPreview() {
  const [status, setStatus] = useState<AgentStatus>("Idle")
  const [pauseReason, setPauseReason] = useState<string | null>(null)
  const [pageUrl, setPageUrl] = useState<string | null>(null)
  const [attached, setAttached] = useState(false)

  const handleStatus = useCallback((s: AgentStatus, reason: string | null) => {
    setStatus(s)
    setPauseReason(reason)
  }, [])

  const handleLog = useCallback((message: string) => {
    const match = message.match(/page_url=(.+)/)
    if (match) {
      setPageUrl(match[1])
    }
  }, [])

  const { connected } = useAgentWs({
    onStatus: handleStatus,
    onLog: handleLog,
  })

  useEffect(() => {
    if (pageUrl && status !== "Idle" && !attached) {
      electronAPI.browser.attachUrl(pageUrl).then((result) => {
        if (result?.status === 'attached') {
          setAttached(true)
        }
      }).catch(() => {})
    }
  }, [pageUrl, status, attached])

  useEffect(() => {
    if (status === "Idle" && attached) {
      electronAPI.browser.detach().then(() => {
        setAttached(false)
        setPageUrl(null)
      }).catch(() => {})
    }
  }, [status, attached])

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {!connected && status !== "Idle" && (
        <div className="bg-yellow-500/10 text-yellow-600 text-xs px-3 py-1.5 border-b border-yellow-500/20">
          Lost connection to backend — reconnecting...
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
        {status === "Idle" && (
          <div className="text-center space-y-3 max-w-md">
            <Monitor className="h-12 w-12 mx-auto text-muted-foreground" />
            <Badge variant="secondary" className="text-sm px-3 py-1">
              Ready
            </Badge>
            <p className="text-sm text-muted-foreground">
              Start an application to begin. The browser preview will appear here automatically.
            </p>
          </div>
        )}

        {status === "Running" && !attached && (
          <div className="text-center space-y-3 max-w-md">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Starting browser preview...</p>
          </div>
        )}

        {status === "Running" && attached && (
          <div className="w-full space-y-3">
            <Badge variant="default" className="text-sm px-3 py-1">
              Agent Working — preview active
            </Badge>
          </div>
        )}

        {status === "Paused" && attached && (
          <div className="w-full space-y-3">
            <Badge variant="destructive" className="text-sm px-3 py-1">
              Paused — You can interact with the browser
            </Badge>
            {pauseReason && (
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-600">
                {pauseReason}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add ui/components/BrowserPreview.tsx ui/lib/electron-api.ts desktop/preload.ts
git commit -m "feat: page_url-based browser preview, remove cdp_port logic"
```

---

### Task 6: End-to-end verification

**Step 1: Build all components**

```bash
cd ui && npm run build
cd ../desktop && npm run build
```

**Step 2: Start the app and test**

1. Open the Electron app: `npm run dev`
2. Upload a resume, go to Jobs, click Apply, click Start
3. Verify:
   - Python connects to Electron's Chromium via CDP
   - Page URL is broadcast via WebSocket
   - WebContentsView loads the page natively (no canvas)
   - Page renders pixel-perfect (text is crisp, not blurry)
   - Window resize dynamically adjusts the preview
   - Agent automation works (form filling, etc.)

**Step 3: Test pause/resume**

1. Click Pause during automation
2. Verify status shows "Paused" badge
3. Click Resume
4. Verify automation continues

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: end-to-end adjustments for native rendering"
```