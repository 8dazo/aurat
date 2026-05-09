import socket
import asyncio
import logging
import httpx
from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)

VIEWPORTS = [
    {"width": 1280, "height": 800},
    {"width": 1366, "height": 768},
    {"width": 1440, "height": 900},
    {"width": 1536, "height": 864},
    {"width": 1920, "height": 1080},
]

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
    port: int = 18733, retries: int = 10, delay: float = 1.0
) -> str:
    """Get CDP WebSocket URL from Electron's info server, with retries."""
    cdp_port = None

    # Get CDP port from Electron info server
    for attempt in range(retries):
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"http://127.0.0.1:{port}/cdp-info", timeout=2.0
                )
                data = resp.json()
                cdp_port = data["cdp_port"]
                logger.info("Got CDP port from Electron: %s", cdp_port)
                break
        except (httpx.ConnectError, httpx.TimeoutException) as e:
            logger.debug(
                "CDP info server not ready (attempt %d/%d): %s", attempt + 1, retries, e
            )
            await asyncio.sleep(delay)

    if cdp_port is None:
        raise RuntimeError(
            f"Could not reach Electron info server at http://127.0.0.1:{port}/cdp-info after {retries} attempts"
        )

    # Get the browser-level WebSocket URL from /json/version (NOT /json which returns page targets)
    for attempt in range(retries):
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"http://127.0.0.1:{cdp_port}/json/version", timeout=2.0
                )
                data = resp.json()
                ws_url = data["webSocketDebuggerUrl"]
                logger.info("Got browser CDP WebSocket URL: %s", ws_url)
                return ws_url
        except (httpx.ConnectError, httpx.TimeoutException) as e:
            logger.debug(
                "CDP endpoint not ready (attempt %d/%d): %s", attempt + 1, retries, e
            )
            await asyncio.sleep(delay)

    raise RuntimeError(
        f"Could not reach CDP endpoint at http://127.0.0.1:{cdp_port}/json/version after {retries} attempts"
    )


async def connect_to_electron(cdp_url: str, info_port: int = 18733):
    """Connect to the Electron browser via CDP.

    Electron's CDP protocol does NOT allow creating new contexts or pages
    (Target.createBrowserContext / Target.createTarget are both unsupported).
    Instead we:
      1. Ask Electron (via its info server) to attach a WebContentsView —
         if one already exists from a prior detection, it is reused.
      2. Connect with Playwright and grab the existing default context.
      3. Find the agent page (the WebContentsView) by excluding the main UI.
    """
    # Step 1 — ask Electron to ensure a WebContentsView exists for the agent
    logger.info("connect_to_electron: requesting agent view from Electron info server")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"http://127.0.0.1:{info_port}/attach-agent-view", timeout=15.0
            )
            logger.info(
                "attach-agent-view response: %s %s", resp.status_code, resp.text
            )
    except Exception as e:
        raise RuntimeError(f"Failed to trigger agent view in Electron: {e}") from e

    # Small pause so the WebContentsView registers as a CDP target
    # (longer if reused, since page may be mid-navigation)
    reused = "reused" in (resp.text or "")
    await asyncio.sleep(0.3 if reused else 0.8)

    # Step 2 — connect to the browser
    pw = await async_playwright().start()
    browser = await pw.chromium.connect_over_cdp(cdp_url)

    if not browser.contexts:
        raise RuntimeError("No browser contexts available after connecting over CDP")
    context = browser.contexts[0]

    # Inject stealth patches into all pages in this context
    await context.add_init_script(STEALTH_SCRIPT)

    # Step 3 — find the agent page (about:blank WebContentsView),
    # NOT the main UI page (localhost:3000)
    pages = context.pages
    logger.info(
        "connect_to_electron: found %d page(s): %s", len(pages), [p.url for p in pages]
    )
    agent_page = next((p for p in pages if "localhost:3000" not in (p.url or "")), None)
    if agent_page is None:
        raise RuntimeError(
            f"Could not find agent page in CDP context. "
            f"Available pages: {[p.url for p in pages]}"
        )

    return pw, browser, context, agent_page


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
