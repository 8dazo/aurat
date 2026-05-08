# Fix Blurry & Non-Dynamic Browser Preview — Design

**Goal:** Eliminate blur in the CDP screencast preview and make it dynamically adjust resolution based on the alloted panel area.

---

## Root Causes

| # | Cause | Effect |
|---|-------|--------|
| 1 | No `devicePixelRatio` handling | Retina displays render canvas at half physical resolution → blurry |
| 2 | No `ResizeObserver` | Canvas doesn't adapt when window/panel resizes |
| 3 | Hardcoded `maxWidth: 1280, maxHeight: 800` | Screencast frames don't match panel size → upscaling blur on large panels, wasted bandwidth on small ones |
| 4 | JPEG quality 70% | Lossy compression adds visual softening |
| 5 | `headless=True` (old mode) | Limited screencast support in old headless mode |
| 6 | Random viewport presets in stealth.py | Playwright viewport doesn't match actual panel dimensions |

---

## Changes

### 1. `desktop/browser-view.html` — DPI-aware canvas + ResizeObserver + dynamic screencast

**DPI-aware canvas rendering:**
- Add `ResizeObserver` on the `#viewport` container
- On resize: `canvas.width = containerWidth * devicePixelRatio`, `canvas.height = containerHeight * devicePixelRatio`
- Canvas CSS: `width: 100%; height: 100%` (stretches to container)
- Scale the 2D context: `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` so drawImage fills the DPR-scaled bitmap
- Debounce resize events (200ms) to avoid restarting screencast on every pixel change

**Dynamic screencast parameters:**
- `startScreencast()` now uses `maxWidth: Math.round(containerWidth * devicePixelRatio)` and `maxHeight: Math.round(containerHeight * devicePixelRatio)` instead of hardcoded 1280x800
- On container resize: send `Page.stopScreencast`, then restart with new dimensions
- Track current screencast params to skip restart if dimensions haven't meaningfully changed (>10px delta)

**Improved frame rendering:**
- `handleScreencastFrame`: apply `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` then `ctx.drawImage(img, 0, 0, canvasWidth / dpr, canvasHeight / dpr)` — draw the frame to fill the CSS-sized area
- JPEG quality: 70 → 85
- Clear canvas before each frame draw to avoid ghosting

**Mouse events — already correct:**
- `getScale()` returns `viewportWidth / canvas.clientWidth` which maps CSS-pixel mouse coords to browser viewport coords — this stays the same

### 2. `engine/utils/stealth.py` — Fix headless mode

- Change `headless=True` → `headless="new"`
- The new headless mode fully supports CDP screencast

### 3. `engine/api/routes.py` — Adaptive viewport (stretch goal)

- Add optional `viewport_width` / `viewport_height` to the `/apply` request
- Pass them to `create_stealth_browser()` to set the Playwright viewport to match the panel
- This ensures the headless browser renders at the same size as the preview panel

---

## What This Gives

- Crisp rendering on Retina displays (2x DPR = 2x resolution bitmap)
- Dynamic preview that adapts resolution when window/panel resizes
- Quality improvement from JPEG 85% + no upscaling artifacts
- Better headless compatibility from `headless="new"`

## What We're NOT Changing

- Overall architecture (CDP screencast via secondary WebSocket)
- `BrowserPreview.tsx` React component (status overlay only)
- `main.ts` WebContentsView bounds logic (already correct)
- `BrowserStatus.tsx` deletion (from prior plan, separate task)