# CDP Screencast Embed — Design Doc

**Date**: 2026-05-14  
**Status**: Approved

## Problem

When the agent runs, CloakBrowser's Chromium opens as a **separate external window** (black background). This window appears outside the Electron app. The current `WebContentsView` approach loads the same URLs independently — it's a separate browser instance with different cookies, scroll position, and state.

## Solution

Run Chrome **headless** (no external window) and stream the agent's actual viewport into the Electron app via CDP screencast. The user sees the real agent browser inside the app.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Electron App                                    │
│                                                  │
│  ┌──────────────────────┐  ┌─────────────────┐  │
│  │  BrowserPreview.tsx  │  │  ControlPanel   │  │
│  │  ┌────────────────┐  │  │                 │  │
│  │  │  <canvas>      │  │  │  Status, logs   │  │
│  │  │  Screencast    │  │  │                 │  │
│  │  │  frames render │  │  │                 │  │
│  │  └────────────────┘  │  │                 │  │
│  └──────────────────────┘  └─────────────────┘  │
│           │ WebSocket                             │
│           ▼                                      │
│  Python Engine (port 18732)                      │
│     ├─ /ws/logs (existing WebSocket + frames)   │
│     └─ ScreencastManager (connects to CDP WS)    │
│           │ CDP WebSocket                        │
│           ▼                                      │
│  CloakBrowser Chromium (headless, CDP 9222)      │
└──────────────────────────────────────────────────┘
```

## Component Changes

### 1. `.env` — Set headless mode
- Change `AURAT_HEADLESS=false` to `AURAT_HEADLESS=true`

### 2. `engine/agents/aurat_agent.py`
- When headless, still call `_notify_electron_attach()` to signal the UI to start listening
- Broadcast the CDP port to the frontend via WebSocket so it knows where to connect
- No structural changes needed

### 3. `engine/api/screencast.py` — Full CDP screencast streaming
- `ScreencastManager` class that:
  - Connects to the Chrome page's CDP WebSocket URL
  - Sends `Page.startScreencast` with format=jpeg, quality=80, maxWidth=1280, maxHeight=900
  - Receives `Page.screencastFrame` events
  - Forwards each frame as base64 JPEG to connected clients via asyncio Queue
  - Acknowledges frames with `Page.screencastFrameAck`
- Start/stop methods tied to agent lifecycle

### 4. `engine/api/ws.py` — Extend WebSocket with screencast frames
- Add message type `screencast_frame` to the existing WebSocket connection
- When agent starts, start screencast; when agent stops, stop screencast
- Send frames: `{ "type": "screencast_frame", "data": "<base64>", "frame_number": N }`

### 5. `engine/api/routes.py`
- Add `POST /api/screencast/start` endpoint
- Add `POST /api/screencast/stop` endpoint

### 6. `desktop/main.ts` — Remove WebContentsView browser preview
- Remove `attachBrowserView` and `detachBrowserView` functions
- Remove `/attach-agent-view` and `/detach-agent-view` endpoints from info server
- Remove `browserView` variable and related resize logic
- Keep `ipcMain.handle('browser:getCdpPort')` for potential future use
- The Electron window only hosts the Next.js UI (which includes the canvas)

### 7. `ui/components/BrowserPreview.tsx` — Canvas-based rendering
- Replace the current approach (which relied on Electron `browser.attachUrl`)
- Add a `<canvas>` element that renders screencast frames
- Listen to WebSocket for `screencast_frame` messages
- On each frame: decode base64 JPEG, create Image, draw on canvas
- Show status overlay (Running/Paused/Completed badge)
- Target 10-15 FPS for smooth experience

### 8. `ui/lib/electron-api.ts` — Remove browser attach/detach
- Remove `browser.attachUrl()` and `browser.detach()` from the electron API
- These are no longer needed since we're not using WebContentsView

## Frame Flow

```
CloakBrowser Chromium
       │ (CDP WebSocket - Page.screencastFrame)
       ▼
ScreencastManager (Python)
       │ (decode, re-encode as needed)
       ▼
ConnectionManager.broadcast (Python)
       │ (WebSocket - ws://localhost:18732/ws/logs)
       ▼
BrowserPreview.tsx (Electron/React)
       │ (base64 → Image → canvas.drawImage())
       ▼
<canvas> element
```

## Key Decisions

- **10-15 FPS**: Balances responsiveness with bandwidth. Can be tuned.
- **Reuse existing WebSocket**: No new connection needed. Frames flow through `/ws/logs`.
- **JPEG quality 80**: Good visual quality at reasonable size (~50-150KB per frame).
- **No input forwarding yet**: The agent handles all interaction. Input forwarding can be added later.