import json
import logging
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.screencast_connections: list[WebSocket] = []
        self.log_connections: list[WebSocket] = []
        self._frame_count = 0

    async def connect_screencast(self, websocket: WebSocket):
        await websocket.accept()
        self.screencast_connections.append(websocket)
        logger.info(
            "Screencast WS connected, total=%d", len(self.screencast_connections)
        )

    async def disconnect_screencast(self, websocket: WebSocket):
        if websocket in self.screencast_connections:
            self.screencast_connections.remove(websocket)
        logger.info(
            "Screencast WS disconnected, total=%d", len(self.screencast_connections)
        )

    async def broadcast_screencast(self, frame: str):
        if not self.screencast_connections:
            return
        self._frame_count += 1
        if self._frame_count <= 5:
            logger.info(
                "Broadcasting frame #%d to %d clients, frame_len=%d",
                self._frame_count,
                len(self.screencast_connections),
                len(frame),
            )
        msg = json.dumps({"type": "frame", "frame": frame})
        for ws in self.screencast_connections[:]:
            try:
                await ws.send_text(msg)
            except Exception:
                if ws in self.screencast_connections:
                    self.screencast_connections.remove(ws)

    async def broadcast_status(self, status: str, pause_reason: str | None = None):
        msg = json.dumps(
            {"type": "status", "status": status, "pause_reason": pause_reason}
        )
        for ws in self.screencast_connections[:]:
            try:
                await ws.send_text(msg)
            except Exception:
                if ws in self.screencast_connections:
                    self.screencast_connections.remove(ws)

    async def connect_log(self, websocket: WebSocket):
        await websocket.accept()
        self.log_connections.append(websocket)

    async def disconnect_log(self, websocket: WebSocket):
        if websocket in self.log_connections:
            self.log_connections.remove(websocket)

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


manager = ConnectionManager()
