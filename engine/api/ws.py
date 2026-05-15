import asyncio
import json
import logging
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.log_connections: list[WebSocket] = []
        self._screencast_queue: asyncio.Queue | None = None

    async def connect_log(self, websocket: WebSocket):
        await websocket.accept()
        self.log_connections.append(websocket)
        logger.info("Log WS connected, total=%d", len(self.log_connections))

    async def disconnect_log(self, websocket: WebSocket):
        if websocket in self.log_connections:
            self.log_connections.remove(websocket)
        logger.info("Log WS disconnected, total=%d", len(self.log_connections))

    async def broadcast_status(self, status: str, pause_reason: str | None = None):
        msg = json.dumps(
            {"type": "status", "status": status, "pause_reason": pause_reason}
        )
        for ws in self.log_connections[:]:
            try:
                await ws.send_text(msg)
            except Exception:
                if ws in self.log_connections:
                    self.log_connections.remove(ws)

    async def broadcast_log(self, step: str, status: str, detail: str = ""):
        msg = json.dumps(
            {"type": "log", "message": detail or status, "step": step, "status": status}
        )
        for ws in self.log_connections[:]:
            try:
                await ws.send_text(msg)
            except Exception:
                if ws in self.log_connections:
                    self.log_connections.remove(ws)

    async def broadcast_screencast_frame(self, frame_data: str, frame_number: int = 0):
        msg = json.dumps(
            {
                "type": "screencast_frame",
                "data": frame_data,
                "frame_number": frame_number,
            }
        )
        for ws in self.log_connections[:]:
            try:
                await ws.send_text(msg)
            except Exception:
                if ws in self.log_connections:
                    self.log_connections.remove(ws)

    async def broadcast_viewport_size(self, width: int, height: int):
        msg = json.dumps({"type": "viewport_size", "width": width, "height": height})
        for ws in self.log_connections[:]:
            try:
                await ws.send_text(msg)
            except Exception:
                if ws in self.log_connections:
                    self.log_connections.remove(ws)

    def set_screencast_queue(self, queue: asyncio.Queue | None):
        self._screencast_queue = queue

    async def start_screencast_broadcast(self):
        from api.screencast import screencast_manager

        if self._screencast_queue:
            return
        await screencast_manager.start()
        self._screencast_queue = screencast_manager.add_frame_queue()
        asyncio.create_task(self._screencast_loop())

    async def stop_screencast_broadcast(self):
        from api.screencast import screencast_manager

        self._screencast_queue = None
        await screencast_manager.stop()

    async def _screencast_loop(self):
        from api.screencast import screencast_manager

        frame_number = 0
        while self._screencast_queue:
            try:
                frame_data = await self._screencast_queue.get()
                frame_number += 1
                await self.broadcast_screencast_frame(frame_data, frame_number)
                size = screencast_manager.get_viewport_size()
                await self.broadcast_viewport_size(size["width"], size["height"])
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Screencast broadcast error: %s", e)
                await asyncio.sleep(0.1)

    async def handle_input_event(self, data: dict):
        from api.screencast import screencast_manager

        input_type = data.get("input_type")
        if input_type == "mouse":
            await screencast_manager.dispatch_mouse_event(data)
        elif input_type == "key":
            await screencast_manager.dispatch_key_event(data)
        elif input_type == "insert_text":
            text = data.get("text", "")
            if text:
                await screencast_manager.dispatch_insert_text(text)


manager = ConnectionManager()
