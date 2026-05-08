# Native Browser Control Mode — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace canvas-based screencast preview with native Playwright browser window + control mode UI (user can take/give control from agent).

**Architecture:** The Playwright browser window opens visibly alongside Electron. The Electron UI shows an agent control panel with status, logs, and Take/Give Control buttons. When the agent runs, it controls the browser. When paused, the user can interact with the browser directly. Screencast streaming, CDP input forwarding, and WebSocket frame transport are removed entirely.

**Tech Stack:** Python/FastAPI (engine), Next.js/React (UI), Electron (desktop shell), Playwright (browser automation)

---

## Task 1: Remove ScreencastStreamer and CDP input from engine

**Files:**
- Delete: `engine/utils/screencast.py`
- Modify: `engine/api/routes.py` — remove ScreencastStreamer usage, `/send_input` endpoint, `_active_streamer` global
- Modify: `engine/api/ws.py` — remove `screencast_connections`, `connect_screencast`, `disconnect_screencast`, `broadcast_screencast`

**Step 1: Delete screencast.py**

Delete the file `engine/utils/screencast.py`.

**Step 2: Remove ScreencastStreamer import and _active_streamer from routes.py**

Remove:
- `from utils.screencast import ScreencastStreamer`
- The line `_active_streamer: ScreencastStreamer | None = None`
- All references to `_active_streamer` in `run_agent()`:
  - `_active_streamer = ScreencastStreamer()`
  - `await _active_streamer.start(page, lambda frame: manager.broadcast_screencast(frame))`
  - The `screencast_connections` log line
  - `if _active_streamer: await _active_streamer.stop()`
  - `_active_streamer = None`

**Step 3: Remove `/send_input` endpoint from routes.py**

Delete the entire `@router.post("/send_input")` function.

**Step 4: Remove `/ws/screencast` endpoint from routes.py**

Delete the entire `@router.websocket("/ws/screencast")` function.

**Step 5: Simplify ws.py — remove screencast-related code**

In `engine/api/ws.py`, remove:
- `self.screencast_connections` list
- `connect_screencast` method
- `disconnect_screencast` method
- `broadcast_screencast` method
- In `broadcast_status` and `broadcast_log`, remove the `for ws in self.screencast_connections[:]` loops (keep only the `log_connections` loops)

Keep only `log_connections`, `connect_log`, `disconnect_log`, `broadcast_log`, and `broadcast_status` (sends to `log_connections` only).

**Step 6: Verify engine starts without errors**

Run: `cd engine && source .venv/bin/activate && python -c "from main import app; print('OK')"`

Expected: prints "OK" with no import errors.

**Step 7: Commit**

```
git add -A && git commit -m "refactor: remove screencast streamer and CDP input forwarding"
```

---

## Task 2: Remove screencast/input from Electron IPC layer

**Files:**
- Modify: `desktop/preload.ts` — remove `onScreencastFrame`, `sendInput`
- Modify: `desktop/ipc-handlers.ts` — remove `python:input` handler
- Modify: `ui/types/electron.d.ts` — remove screencast/input types
- Modify: `ui/lib/electron-api.ts` — remove `onScreencastFrame`, `sendInput`

**Step 1: Update preload.ts**

Remove from the `python` object in `contextBridge.exposeInMainWorld`:
- `onScreencastFrame` callback registration (lines 7-10)
- `sendInput` function (lines 17-18)

**Step 2: Update ipc-handlers.ts**

Remove the `ipcMain.on('python:input', ...)` handler block (lines 56-62).

**Step 3: Update electron.d.ts**

Remove from `Window.electronAPI.python`:
- `onScreencastFrame` type (line 8)
- `sendInput` type (line 10)

**Step 4: Update electron-api.ts**

Remove from `electronAPI.python`:
- `onScreencastFrame` method (lines 23-28)
- `sendInput` method (lines 35-38)

**Step 5: Verify UI builds**

Run: `cd ui && npx next build`
Run: `cd desktop && npx tsc --noEmit`
Expected: both pass without errors.

**Step 6: Commit**

```
git add -A && git commit -m "refactor: remove screencast/input from Electron IPC layer"
```

---

## Task 3: Delete LivePreview and simplify use-agent-ws

**Files:**
- Delete: `ui/components/LivePreview.tsx`
- Modify: `ui/lib/use-agent-ws.ts` — remove `onFrame`, connect to `/ws/logs` instead of `/ws/screencast`
- Modify: `ui/app/apply/page.tsx` — remove LivePreview import and usage, replace with placeholder

**Step 1: Delete LivePreview.tsx**

Delete `ui/components/LivePreview.tsx`.

**Step 2: Rewrite use-agent-ws.ts**

Remove `onFrame` from the interface and all frame-related code. Connect to `/ws/logs` instead of `/ws/screencast`:

```typescript
"use client"

import { useEffect, useRef, useCallback } from "react"

const WS_URL = "ws://localhost:18732"
const RECONNECT_DELAY = 2000

export type AgentStatus = "Idle" | "Running" | "Paused"

interface UseAgentWsOptions {
  onStatus?: (status: AgentStatus, pauseReason: string | null) => void
  onLog?: (message: string) => void
}

export function useAgentWs({ onStatus, onLog }: UseAgentWsOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(`${WS_URL}/ws/logs`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "status" && onStatus) {
          onStatus(data.status ?? "Idle", data.pause_reason ?? null)
        } else if (data.type === "log" && onLog) {
          onLog(data.message)
        }
      } catch { /* ignore non-JSON */ }
    }

    ws.onclose = () => {
      wsRef.current = null
      reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [onStatus, onLog])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connect])

  return wsRef
}
```

**Step 3: Update apply/page.tsx**

Remove `import { LivePreview } from "@/components/LivePreview"` and replace `<LivePreview />` with a simple placeholder div for now (BrowserStatus component created in Task 4):

```tsx
<div className="flex-1 flex items-center justify-center bg-muted/30">
  <p className="text-sm text-muted-foreground">Agent status will appear here</p>
</div>
```

Also remove the `onFrame` prop from any `useAgentWs` calls in this file if present.

**Step 4: Verify UI builds**

Run: `cd ui && npx next build`
Expected: passes.

**Step 5: Commit**

```
git add -A && git commit -m "refactor: remove LivePreview canvas, simplify WS to logs-only"
```

---

## Task 4: Create BrowserStatus component

**Files:**
- Create: `ui/components/BrowserStatus.tsx`

**Step 1: Create BrowserStatus.tsx**

```tsx
"use client"

import { useState } from "react"
import { useAgentWs, type AgentStatus } from "@/lib/use-agent-ws"
import { electronAPI } from "@/lib/electron-api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Monitor, Pause, Play } from "lucide-react"

const statusLabel: Record<AgentStatus, string> = {
  Idle: "Ready",
  Running: "Agent Working",
  Paused: "Paused — You Have Control",
}

const statusDescription: Record<AgentStatus, string> = {
  Idle: "Start an application to begin. A browser window will open automatically when the agent starts.",
  Running: "The agent is filling in the form. Avoid interacting with the browser window — your clicks may conflict with the agent.",
  Paused: "The agent is paused. You can interact with the browser window directly. Take your time, then give control back when ready.",
}

const statusVariant: Record<AgentStatus, "default" | "secondary" | "destructive"> = {
  Idle: "secondary",
  Running: "default",
  Paused: "destructive",
}

export function BrowserStatus() {
  const [status, setStatus] = useState<AgentStatus>("Idle")
  const [pauseReason, setPauseReason] = useState<string | null>(null)

  useAgentWs({
    onStatus: (s, reason) => {
      setStatus(s)
      setPauseReason(reason)
    },
  })

  const handlePause = async () => {
    try {
      await electronAPI.python.request("/pause")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to pause")
    }
  }

  const handleResume = async () => {
    try {
      await electronAPI.python.request("/resume")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resume")
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8 bg-muted/30">
      <div className="text-center space-y-3 max-w-md">
        <Monitor className="h-12 w-12 mx-auto text-muted-foreground" />
        <Badge variant={statusVariant[status]} className="text-sm px-3 py-1">
          {statusLabel[status]}
        </Badge>
        <p className="text-sm text-muted-foreground">
          {statusDescription[status]}
        </p>
        {status === "Running" && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-600">
            <AlertTriangle className="h-4 w-4 inline mr-2" />
            <strong>Warning:</strong> Avoid clicking the browser window while the agent is working.
          </div>
        )}
        {status === "Paused" && pauseReason && (
          <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-600">
            {pauseReason}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handlePause}
          disabled={status !== "Running"}
          variant="outline"
        >
          <Pause className="h-4 w-4 mr-2" />
          Take Control
        </Button>
        <Button
          onClick={handleResume}
          disabled={status !== "Paused"}
        >
          <Play className="h-4 w-4 mr-2" />
          Give Control Back
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: Verify UI builds**

Run: `cd ui && npx next build`
Expected: passes.

**Step 3: Commit**

```
git add -A && git commit -m "feat: add BrowserStatus component with Take/Give Control UI"
```

---

## Task 5: Wire BrowserStatus into Apply page and update ControlPanel

**Files:**
- Modify: `ui/app/apply/page.tsx` — replace placeholder with `<BrowserStatus />`
- Modify: `ui/components/ControlPanel.tsx` — rename Pause/Resume to "Take Control"/"Give Control Back"

**Step 1: Update apply/page.tsx**

Replace the placeholder div with:
```tsx
import { BrowserStatus } from "@/components/BrowserStatus"
```

And in JSX:
```tsx
<div className="flex-1">
  <BrowserStatus />
</div>
```

**Step 2: Update ControlPanel.tsx**

Find the Pause button and change its text from "Pause" to "Take Control".
Find the Resume button and change its text from "Resume" to "Give Control Back".

**Step 3: Verify build**

Run: `cd ui && npx next build`

**Step 4: Commit**

```
git add -A && git commit -m "feat: wire BrowserStatus into Apply page, update ControlPanel labels"
```

---

## Task 6: Add anti-bot enhancements to agent

**Files:**
- Modify: `engine/utils/stealth.py` — add randomized viewport, realistic user-agent
- Modify: `engine/utils/human_input.py` — add pre-interaction jitter

**Step 1: Enhance stealth.py**

Update `create_stealth_browser()` to:
- Import `random` at top
- Add a `VIEWPORTS` list of common viewport sizes
- Use `random.choice(VIEWPORTS)` for viewport
- Add `user_agent` with a realistic Chrome UA string to `browser.new_context()`

**Step 2: Add pre-interaction jitter to human_input.py**

Add `await asyncio.sleep(random.uniform(0.1, 0.4))` at the start of `human_type()` and `await asyncio.sleep(random.uniform(0.1, 0.3))` at the start of `human_click()`.

**Step 3: Verify engine starts**

Run: `cd engine && source .venv/bin/activate && python -c "from main import app; print('OK')"`

**Step 4: Commit**

```
git add -A && git commit -m "feat: anti-bot enhancements — random viewport, user-agent, pre-interaction jitter"
```

---

## Task 7: Final cleanup and end-to-end test

**Step 1: Search for any remaining screencast/sendInput references**

Run: `rg "screencast|sendInput|send_input|ScreencastStreamer|onScreencastFrame|LivePreview" --glob '*.{ts,tsx,py}'`

Expected: no matches (or only in comments/git history).

**Step 2: Verify all builds pass**

```bash
cd ui && npx next build
cd ../desktop && npx tsc --noEmit
cd ../engine && source .venv/bin/activate && python -c "from main import app; print('OK')"
```

All three should pass.

**Step 3: Commit any final cleanup**

```
git add -A && git commit -m "chore: final cleanup for native browser control mode"
```

---

## Summary of all changes

| Area | Change |
|------|--------|
| `engine/utils/screencast.py` | **DELETED** |
| `engine/api/routes.py` | Remove ScreencastStreamer, `/send_input`, `/ws/screencast`; simplify `/apply` runner |
| `engine/api/ws.py` | Remove screencast WS; keep only log WS |
| `engine/utils/stealth.py` | Add random viewport, realistic user-agent |
| `engine/utils/human_input.py` | Add pre-interaction jitter |
| `desktop/preload.ts` | Remove `onScreencastFrame`, `sendInput` |
| `desktop/ipc-handlers.ts` | Remove `python:input` handler |
| `ui/lib/electron-api.ts` | Remove `onScreencastFrame`, `sendInput` |
| `ui/lib/use-agent-ws.ts` | Remove `onFrame`, connect to `/ws/logs` only |
| `ui/types/electron.d.ts` | Remove screencast/input types |
| `ui/components/LivePreview.tsx` | **DELETED** |
| `ui/components/BrowserStatus.tsx` | **NEW** — agent status + control mode UI |
| `ui/components/ControlPanel.tsx` | Rename buttons to "Take Control" / "Give Control Back" |
| `ui/app/apply/page.tsx` | Replace `<LivePreview />` with `<BrowserStatus />` |