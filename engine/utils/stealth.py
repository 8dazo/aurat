import socket
import httpx
from playwright.async_api import async_playwright

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


async def get_electron_cdp_url(port: int = 18733) -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"http://127.0.0.1:{port}/cdp-info")
        data = resp.json()
        cdp_port = data["cdp_port"]

    async with httpx.AsyncClient() as client:
        resp = await client.get(f"http://127.0.0.1:{cdp_port}/json")
        targets = resp.json()
        browser_target = next(
            (t for t in targets if t.get("type") == "page"),
            targets[0],
        )
        return browser_target["webSocketDebuggerUrl"]


async def connect_to_electron(cdp_url: str):
    pw = await async_playwright().start()
    browser = await pw.chromium.connect_over_cdp(cdp_url)

    context = (
        browser.contexts[0]
        if browser.contexts
        else await browser.new_context(
            viewport=VIEWPORTS[0],
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/136.0.0.0 Safari/537.36"
            ),
        )
    )

    await context.add_init_script(STEALTH_SCRIPT)

    page = context.pages[0] if context.pages else await context.new_page()

    return pw, browser, context, page


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
