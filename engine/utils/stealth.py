"""
stealth.py — CDP connection utilities for Electron's Chromium.

Electron owns the Chromium instance (with --remote-debugging-port).
browser-use connects via BrowserConfig(cdp_url=...) to automate the
same browser that the WebContentsView renders natively inside the app.

Stealth patches are injected via BrowserConfig's on_context callback.
"""

from __future__ import annotations

import asyncio
import logging

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


async def get_electron_cdp_url(
    info_port: int = 18733, retries: int = 5, delay: float = 2.0
) -> str:
    """Get the CDP WebSocket URL from Electron's info server.

    Retries up to `retries` times with `delay` seconds between attempts,
    because CDP may not be available immediately after attach-agent-view.
    """
    for attempt in range(1, retries + 1):
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"http://127.0.0.1:{info_port}/cdp-info",
                    timeout=httpx.Timeout(timeout=5.0),
                )
                data = resp.json()
                cdp_port = data["cdp_port"]

            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"http://127.0.0.1:{cdp_port}/json",
                    timeout=httpx.Timeout(timeout=5.0),
                )
                targets = resp.json()
                agent_page = next(
                    (
                        t
                        for t in targets
                        if t.get("type") == "page"
                        and "localhost:3000" not in t.get("url", "")
                    ),
                    targets[0],
                )
                ws_url = agent_page["webSocketDebuggerUrl"]
                logger.info("Got CDP WS URL: %s (attempt %d)", ws_url[:60], attempt)
                return ws_url
        except Exception as e:
            logger.warning(
                "get_electron_cdp_url attempt %d/%d failed: %s", attempt, retries, e
            )
            if attempt < retries:
                await asyncio.sleep(delay)
    raise RuntimeError(f"Could not get Electron CDP URL after {retries} attempts")


async def attach_agent_view(info_port: int = 18733) -> None:
    """Ask Electron to create/reuse a WebContentsView for the agent."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"http://127.0.0.1:{info_port}/attach-agent-view",
            timeout=httpx.Timeout(timeout=15.0),
        )
        logger.info("attach-agent-view response: %s %s", resp.status_code, resp.text)


async def detach_agent_view(info_port: int = 18733) -> None:
    """Ask Electron to remove the agent WebContentsView."""
    async with httpx.AsyncClient() as client:
        await client.get(
            f"http://127.0.0.1:{info_port}/detach-agent-view",
            timeout=httpx.Timeout(timeout=5.0),
        )


async def check_browser_installed() -> str | None:
    try:
        from playwright._impl._driver import compute_driver_executable
        import subprocess

        driver_executable = compute_driver_executable()
        if isinstance(driver_executable, tuple):
            node_path, cli_path = driver_executable
            cmd = [node_path, cli_path]
        else:
            cmd = [str(driver_executable)]
        result = subprocess.run(
            cmd + ["install", "--dry-run", "chromium"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            return "chromium"
        return None
    except Exception:
        return None


async def install_browser() -> dict:
    try:
        from playwright._impl._driver import compute_driver_executable
        import subprocess

        driver_executable = compute_driver_executable()
        if isinstance(driver_executable, tuple):
            node_path, cli_path = driver_executable
            cmd = [node_path, cli_path]
        else:
            cmd = [str(driver_executable)]
        result = subprocess.run(
            cmd + ["install", "chromium"],
            capture_output=True,
            text=True,
            timeout=300,
        )
        if result.returncode == 0:
            return {"status": "installed", "browser": "chromium"}
        return {"status": "error", "message": result.stderr or result.stdout}
    except Exception as e:
        return {"status": "error", "message": str(e)}
