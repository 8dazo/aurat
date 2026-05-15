import asyncio
import json
import logging
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.log_connections: list[WebSocket] = []

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


manager = ConnectionManager()
