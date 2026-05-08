from playwright.async_api import Page, CDPSession


class ScreencastStreamer:
    def __init__(self):
        self.cdp: CDPSession | None = None
        self.active = False
        self.on_frame = None

    async def start(self, page: Page, on_frame_callback):
        self.cdp = await page.context.new_cdp_session(page)
        await self.cdp.send(
            "Page.startScreencast",
            {
                "format": "jpeg",
                "quality": 70,
                "maxWidth": 1280,
                "maxHeight": 800,
            },
        )
        self.active = True
        self.on_frame = on_frame_callback

        async def handle_frame(event):
            if not self.active:
                return
            if self.on_frame:
                await self.on_frame(event["data"])
            try:
                await self.cdp.send(
                    "Page.screencastFrameAck", {"sessionId": event["sessionId"]}
                )
            except Exception:
                pass

        self.cdp.on("Page.screencastFrame", handle_frame)

    async def stop(self):
        if self.cdp and self.active:
            try:
                await self.cdp.send("Page.stopScreencast")
            except Exception:
                pass
            self.active = False

    async def dispatch_mouse(
        self,
        event_type: str,
        x: int,
        y: int,
        button: str = "left",
        click_count: int = 1,
    ):
        if not self.cdp:
            return
        await self.cdp.send(
            "Input.dispatchMouseEvent",
            {
                "type": event_type,
                "x": x,
                "y": y,
                "button": button,
                "clickCount": click_count,
            },
        )

    async def dispatch_key(self, type: str, key: str, text: str = "", code: str = ""):
        if not self.cdp:
            return
        params = {"type": type, "key": key}
        if text:
            params["text"] = text
        if code:
            params["code"] = code
        await self.cdp.send("Input.dispatchKeyEvent", params)

    async def dispatch_key_event(self, event: dict):
        if not self.cdp:
            return
        await self.cdp.send("Input.dispatchKeyEvent", event)
