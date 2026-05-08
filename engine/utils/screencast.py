import logging

from playwright.async_api import Page, CDPSession

logger = logging.getLogger(__name__)


class ScreencastStreamer:
    def __init__(self):
        self.cdp: CDPSession | None = None
        self.active = False
        self.on_frame = None
        self._frame_count = 0

    async def start(self, page: Page, on_frame_callback):
        logger.info("Screencast starting: creating CDP session...")
        self.cdp = await page.context.new_cdp_session(page)
        logger.info("CDP session created: %s", type(self.cdp).__name__)
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
        self._frame_count = 0

        async def handle_frame(event):
            if not self.active:
                return
            self._frame_count += 1
            frame_data = event.get("data", "")
            if self._frame_count <= 3:
                logger.info(
                    "Screencast frame #%d: len=%d", self._frame_count, len(frame_data)
                )
            if self.on_frame:
                await self.on_frame(frame_data)
            try:
                await self.cdp.send(
                    "Page.screencastFrameAck", {"sessionId": event["sessionId"]}
                )
            except Exception:
                pass

        self.cdp.on("Page.screencastFrame", handle_frame)
        logger.info("Screencast started, listening for frames")

        # Send an immediate screenshot as the first frame
        try:
            screenshot_bytes = await page.screenshot(type="jpeg", quality=70)
            import base64

            first_frame = base64.b64encode(screenshot_bytes).decode("utf-8")
            logger.info("Initial screenshot: len=%d", len(first_frame))
            if self.on_frame:
                await self.on_frame(first_frame)
        except Exception as e:
            logger.warning("Failed to capture initial screenshot: %s", e)

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
