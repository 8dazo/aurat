from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.screencast_connections: list[WebSocket] = []
        self.log_connections: list[WebSocket] = []

    async def connect_screencast(self, websocket: WebSocket):
        await websocket.accept()
        self.screencast_connections.append(websocket)

    async def disconnect_screencast(self, websocket: WebSocket):
        self.screencast_connections.remove(websocket)

    async def broadcast_screencast(self, frame: str):
        for ws in self.screencast_connections[:]:
            try:
                await ws.send_text(frame)
            except Exception:
                self.screencast_connections.remove(ws)

    async def connect_log(self, websocket: WebSocket):
        await websocket.accept()
        self.log_connections.append(websocket)

    async def disconnect_log(self, websocket: WebSocket):
        self.log_connections.remove(
            websocket
        ) if websocket in self.log_connections else None

    async def broadcast_log(self, message: str):
        for ws in self.log_connections[:]:
            try:
                await ws.send_text(message)
            except Exception:
                self.log_connections.remove(ws)


manager = ConnectionManager()
