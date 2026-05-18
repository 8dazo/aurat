"""
stealth.py — CloakBrowser launch + Electron external window attach utilities.

Launches CloakBrowser (stealth Chromium) with --app= and --remote-debugging-port,
then tells Electron to magnetize the window via AXUIElement.
"""

from __future__ import annotations

import asyncio
import logging
import subprocess

import httpx

logger = logging.getLogger(__name__)

CLOAK_CDP_PORT = 9242
ELECTRON_INFO_PORT = 18733

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


async def launch_cloakbrowser(job_url: str) -> dict:
    """Launch CloakBrowser in --app= mode and tell Electron to magnetize it.

    Returns dict with keys: pid, cdp_url, browser (Playwright Browser obj).
    """
    from cloakbrowser import launch_async

    browser = await launch_async(
        headless=False,
        args=[
            f"--app={job_url}",
            f"--remote-debugging-port={CLOAK_CDP_PORT}",
        ],
    )

    ctx = browser.contexts[0] if browser.contexts else await browser.new_context()
    page = ctx.pages[0] if ctx.pages else await ctx.new_page()
    await page.goto(job_url, wait_until="domcontentloaded", timeout=30000)
    await asyncio.sleep(2)

    main_pid = _get_chromium_main_pid()
    if not main_pid:
        raise RuntimeError("Could not find CloakBrowser main process PID")

    await _attach_external_view(main_pid, f"http://127.0.0.1:{CLOAK_CDP_PORT}")

    return {
        "pid": main_pid,
        "cdp_url": f"http://127.0.0.1:{CLOAK_CDP_PORT}",
        "browser": browser,
    }


def _get_chromium_main_pid() -> int | None:
    proc = subprocess.run(["ps", "aux"], capture_output=True, text=True)
    for line in proc.stdout.split("\n"):
        if (
            "Chromium.app/Contents/MacOS/Chromium" in line
            and "--type=" not in line
            and "grep" not in line
            and "python" not in line
        ):
            try:
                return int(line.split()[1])
            except (IndexError, ValueError):
                continue
    return None


async def _attach_external_view(pid: int, cdp_url: str) -> None:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"http://127.0.0.1:{ELECTRON_INFO_PORT}/attach-external-view",
            json={"pid": pid, "cdp_url": cdp_url},
            timeout=httpx.Timeout(timeout=15.0),
        )
        logger.info("attach-external-view response: %s %s", resp.status_code, resp.text)


async def detach_external_view() -> None:
    async with httpx.AsyncClient() as client:
        await client.get(
            f"http://127.0.0.1:{ELECTRON_INFO_PORT}/detach-external-view",
            timeout=httpx.Timeout(timeout=5.0),
        )


async def get_cloakbrowser_cdp_url(retries: int = 10, delay: float = 1.0) -> str:
    """Get the CDP WebSocket URL from CloakBrowser on port 9242."""
    for attempt in range(1, retries + 1):
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"http://127.0.0.1:{CLOAK_CDP_PORT}/json",
                    timeout=httpx.Timeout(timeout=5.0),
                )
                targets = resp.json()
                page_target = next(
                    (t for t in targets if t.get("type") == "page"),
                    targets[0],
                )
                ws_url = page_target["webSocketDebuggerUrl"]
                logger.info("Got CloakBrowser CDP WS URL (attempt %d)", attempt)
                return ws_url
        except Exception as e:
            logger.warning(
                "get_cloakbrowser_cdp_url attempt %d/%d failed: %s", attempt, retries, e
            )
            if attempt < retries:
                await asyncio.sleep(delay)
    raise RuntimeError(f"Could not get CloakBrowser CDP URL after {retries} attempts")


async def attach_agent_view(info_port: int = 18733) -> None:
    """Compatibility stub — no longer needed with external window approach."""
    pass


async def detach_agent_view(info_port: int = 18733) -> None:
    """Compatibility stub — calls detach-external-view instead."""
    await detach_external_view()


async def get_electron_cdp_url(
    info_port: int = 18733, retries: int = 5, delay: float = 2.0
) -> str:
    """Compatibility stub — redirects to CloakBrowser CDP."""
    return await get_cloakbrowser_cdp_url(retries=retries, delay=delay)


async def check_browser_installed() -> str | None:
    try:
        from cloakbrowser import binary_info

        info = binary_info()
        return "chromium" if info.get("installed") else None
    except Exception:
        return None


async def install_browser() -> dict:
    try:
        from cloakbrowser import install

        install()
        return {"status": "installed", "browser": "chromium"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
