"""
screencast.py — CDP screencast streaming + input forwarding for embedding browser in Electron.

Connects to CloakBrowser's Chromium via CDP WebSocket, starts
Page.startScreencast, receives JPEG frames, and forwards them
through asyncio queues for WebSocket broadcast to the frontend.

Also receives input events (mouse, keyboard, scroll) from the frontend
and dispatches them to Chrome via CDP Input.* commands.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Optional

import httpx
import websockets

logger = logging.getLogger(__name__)

CDP_PORT = int(__import__("os").environ.get("AURAT_CDP_PORT", "9222"))

_MOUSE_BUTTONS = {"left": "none", "middle": "middle", "right": "right"}
_KEY_EVENT_TYPES = {"keyDown", "keyUp", "char"}


class ScreencastManager:
    def __init__(self, cdp_port: int = CDP_PORT):
        self.cdp_port = cdp_port
        self._ws = None
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._frame_queues: list[asyncio.Queue] = []
        self._msg_id = 0
        self._viewport_width: int = 1280
        self._viewport_height: int = 900

    async def start(self):
        if self._running:
            return
        ws_url = await self._get_page_ws_url()
        if not ws_url:
            logger.error("No CDP page found for screencast on port %d", self.cdp_port)
            return
        self._running = True
        self._task = asyncio.create_task(self._run(ws_url))
        logger.info("Screencast started on CDP port %d", self.cdp_port)

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        if self._ws:
            try:
                await self._ws.close()
            except Exception:
                pass
            self._ws = None
        self._frame_queues.clear()
        logger.info("Screencast stopped")

    def add_frame_queue(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=10)
        self._frame_queues.append(q)
        return q

    def remove_frame_queue(self, q: asyncio.Queue):
        if q in self._frame_queues:
            self._frame_queues.remove(q)

    def get_viewport_size(self) -> dict:
        return {"width": self._viewport_width, "height": self._viewport_height}

    async def dispatch_mouse_event(self, event: dict):
        if not self._ws or not self._running:
            return
        event_type = event.get("type", "mousePressed")
        x = float(event.get("x", 0))
        y = float(event.get("y", 0))
        button = event.get("button", "left")
        click_count = int(event.get("click_count", 1))
        modifiers = int(event.get("modifiers", 0))
        delta_x = float(event.get("delta_x", 0))
        delta_y = float(event.get("delta_y", 0))

        if event_type == "wheel":
            await self._send_cdp(
                "Input.dispatchMouseEvent",
                {
                    "type": "mouseWheel",
                    "x": x,
                    "y": y,
                    "deltaX": delta_x,
                    "deltaY": delta_y,
                    "modifiers": modifiers,
                },
            )
            return

        cdp_button = "none"
        if event_type in ("mousePressed", "mouseReleased"):
            cdp_button = _MOUSE_BUTTONS.get(button, "none")

        params = {
            "type": event_type,
            "x": x,
            "y": y,
            "button": cdp_button,
            "clickCount": click_count,
            "modifiers": modifiers,
        }
        await self._send_cdp("Input.dispatchMouseEvent", params)

    async def dispatch_key_event(self, event: dict):
        if not self._ws or not self._running:
            return
        event_type = event.get("type", "keyDown")
        if event_type not in _KEY_EVENT_TYPES:
            return
        params = {
            "type": event_type,
            "key": event.get("key", ""),
            "code": event.get("code", ""),
            "modifiers": int(event.get("modifiers", 0)),
            "text": event.get("text", ""),
            "windowsVirtualKeyCode": event.get("windowsVirtualKeyCode"),
            "nativeVirtualKeyCode": event.get("nativeVirtualKeyCode"),
        }
        params = {k: v for k, v in params.items() if v is not None}
        await self._send_cdp("Input.dispatchKeyEvent", params)

    async def dispatch_insert_text(self, text: str):
        if not self._ws or not self._running:
            return
        await self._send_cdp("Input.insertText", {"text": text})

    async def dispatch_touch_event(self, event: dict):
        if not self._ws or not self._running:
            return
        event_type = event.get("type", "touchStart")
        x = float(event.get("x", 0))
        y = float(event.get("y", 0))
        await self._send_cdp(
            "Input.dispatchTouchEvent",
            {
                "type": event_type,
                "touchPoints": [{"x": x, "y": y}],
            },
        )

    async def _get_page_ws_url(self) -> Optional[str]:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"http://127.0.0.1:{self.cdp_port}/json/list",
                    timeout=httpx.Timeout(timeout=5.0),
                )
                if resp.status_code == 200:
                    tabs = resp.json()
                    for tab in tabs:
                        url = tab.get("url", "")
                        if (
                            url
                            and url != "about:blank"
                            and not url.startswith("chrome")
                        ):
                            return tab.get("webSocketDebuggerUrl")
                    if tabs:
                        return tabs[0].get("webSocketDebuggerUrl")
        except Exception as e:
            logger.debug("Could not get CDP page list: %s", e)
        return None

    async def _send_cdp(self, method: str, params: dict | None = None):
        if not self._ws:
            return
        self._msg_id += 1
        msg = {"id": self._msg_id, "method": method}
        if params:
            msg["params"] = params
        await self._ws.send(json.dumps(msg))

    async def _run(self, ws_url: str):
        try:
            async with websockets.connect(ws_url, max_size=10 * 1024 * 1024) as ws:
                self._ws = ws
                await self._send_cdp(
                    "Page.startScreencast",
                    {
                        "format": "jpeg",
                        "quality": 80,
                        "maxWidth": 1280,
                        "maxHeight": 900,
                        "everyNthFrame": 1,
                    },
                )
                async for message in ws:
                    if not self._running:
                        break
                    try:
                        data = json.loads(message)
                    except json.JSONDecodeError:
                        continue

                    if data.get("method") == "Page.screencastFrame":
                        params = data.get("params", {})
                        frame_data = params.get("data")
                        session_id = params.get("sessionId")
                        metadata = params.get("metadata", {})
                        if metadata:
                            self._viewport_width = metadata.get(
                                "screenWidth", self._viewport_width
                            )
                            self._viewport_height = metadata.get(
                                "screenHeight", self._viewport_height
                            )
                        if frame_data:
                            await self._ack_frame(session_id)
                            await self._broadcast_frame(frame_data)
                    elif data.get("method") == "Page.screencastVisibilityChanged":
                        logger.debug(
                            "Screencast visibility: %s",
                            data.get("params", {}).get("visible"),
                        )
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error("Screencast error: %s", e)
        finally:
            self._running = False
            self._ws = None

    async def _ack_frame(self, session_id: Optional[int]):
        try:
            if self._ws:
                self._msg_id += 1
                msg = {
                    "id": self._msg_id,
                    "method": "Page.screencastFrameAck",
                    "params": {"sessionId": session_id},
                }
                await self._ws.send(json.dumps(msg))
        except Exception:
            pass

    async def _broadcast_frame(self, frame_data: str):
        dead_queues = []
        for q in self._frame_queues:
            try:
                q.put_nowait(frame_data)
            except asyncio.QueueFull:
                try:
                    q.get_nowait()
                except asyncio.QueueEmpty:
                    pass
                try:
                    q.put_nowait(frame_data)
                except asyncio.QueueFull:
                    pass
            except Exception:
                dead_queues.append(q)
        for q in dead_queues:
            self._frame_queues.remove(q)


screencast_manager = ScreencastManager()
