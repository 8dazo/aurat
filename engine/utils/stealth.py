"""
stealth.py — CDP connection utilities for CloakBrowser's Chromium.

CloakBrowser runs as an external process with its own CDP port.
Electron magnetizes the CloakBrowser window via AXUIElement.
browser-use connects via BrowserConfig(cdp_url=...) to CloakBrowser's CDP.

Stealth patches are injected via BrowserConfig's on_context callback.
"""

from __future__ import annotations

import asyncio
import logging
import subprocess

import httpx

logger = logging.getLogger(__name__)

STEALTH_SCRIPT = """
// Remove navigator.webdriver
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

// Mock chrome.runtime
if (!window.chrome) {
    window.chrome = { runtime: {} };
}

// Override permissions.query
const originalQuery = window.navigator.permissions.query.bind(window.navigator.permissions);
window.navigator.permissions.query = (parameters) => (
    parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters)
);

// Mock plugins
Object.defineProperty(navigator, 'plugins', {
    get: () => [1, 2, 3, 4, 5],
});

// Mock languages
Object.defineProperty(navigator, 'languages', {
    get: () => ['en-US', 'en'],
});
"""


CLOAKBROWSER_CDP_PORT = 9242


def _find_cloakbrowser_pid() -> int | None:
    """Find the main CloakBrowser Chromium process PID."""
    try:
        result = subprocess.run(
            ["ps", "aux"], capture_output=True, text=True, timeout=5
        )
        for line in result.stdout.split("\n"):
            if (
                "Chromium.app/Contents/MacOS/Chromium" in line
                and "--type=" not in line
                and "grep" not in line
                and "Electron" not in line
                and f"remote-debugging-port={CLOAKBROWSER_CDP_PORT}" in line
            ):
                return int(line.split()[1])
    except Exception as e:
        logger.warning("Failed to find CloakBrowser PID: %s", e)
    return None


async def launch_cloakbrowser(job_url: str) -> dict:
    """Launch CloakBrowser and return {pid, cdp_url}."""
    from cloakbrowser import launch_async

    browser = await launch_async(
        headless=False,
        args=[
            f"--app={job_url}",
            f"--remote-debugging-port={CLOAKBROWSER_CDP_PORT}",
        ],
    )

    context = browser.contexts[0] if browser.contexts else await browser.new_context()
    page = context.pages[0] if context.pages else await context.new_page()
    await page.goto(job_url, wait_until="domcontentloaded")
    await asyncio.sleep(2)

    pid = _find_cloakbrowser_pid()
    if not pid:
        raise RuntimeError("Could not find CloakBrowser main process PID")

    cdp_url = f"http://127.0.0.1:{CLOAKBROWSER_CDP_PORT}"
    logger.info("CloakBrowser launched: PID=%d, CDP=%s", pid, cdp_url)
    return {"pid": pid, "cdp_url": cdp_url, "browser": browser}


async def attach_external_view(pid: int, cdp_url: str, info_port: int = 18733) -> dict:
    """Ask Electron to magnetize the CloakBrowser window via AXUIElement."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"http://127.0.0.1:{info_port}/attach-external-view",
            json={"pid": pid, "cdp_url": cdp_url},
            timeout=httpx.Timeout(timeout=30.0),
        )
        data = resp.json()
        logger.info("attach-external-view response: %s", data)
        return data


async def detach_external_view(info_port: int = 18733) -> None:
    """Ask Electron to detach the CloakBrowser window."""
    async with httpx.AsyncClient() as client:
        await client.get(
            f"http://127.0.0.1:{info_port}/detach-external-view",
            timeout=httpx.Timeout(timeout=5.0),
        )


async def get_cloakbrowser_cdp_url(retries: int = 5, delay: float = 2.0) -> str:
    """Get the CDP WebSocket URL from CloakBrowser's Chromium."""
    for attempt in range(1, retries + 1):
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"http://127.0.0.1:{CLOAKBROWSER_CDP_PORT}/json",
                    timeout=httpx.Timeout(timeout=5.0),
                )
                targets = resp.json()
                agent_page = next(
                    (t for t in targets if t.get("type") == "page"),
                    targets[0],
                )
                ws_url = agent_page["webSocketDebuggerUrl"]
                logger.info(
                    "Got CloakBrowser CDP WS URL: %s (attempt %d)", ws_url[:60], attempt
                )
                return ws_url
        except Exception as e:
            logger.warning(
                "get_cloakbrowser_cdp_url attempt %d/%d failed: %s", attempt, retries, e
            )
            if attempt < retries:
                await asyncio.sleep(delay)
    raise RuntimeError(f"Could not get CloakBrowser CDP URL after {retries} attempts")


async def check_browser_installed() -> str | None:
    try:
        from cloakbrowser import binary_info

        info = binary_info()
        return "chromium" if info.get("installed") else None
    except Exception:
        return None


async def install_browser() -> dict:
    try:
        from cloakbrowser import binary_info, install

        info = binary_info()
        if info.get("installed"):
            return {"status": "installed", "browser": "chromium"}
        await install()
        return {"status": "installed", "browser": "chromium"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
