import random
import socket
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

VIEWPORTS = [
    {"width": 1280, "height": 800},
    {"width": 1366, "height": 768},
    {"width": 1440, "height": 900},
    {"width": 1536, "height": 864},
    {"width": 1920, "height": 1080},
]


def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


async def create_stealth_browser(cdp_port: int | None = None):
    if cdp_port is None:
        cdp_port = _find_free_port()
    pw = await async_playwright().start()
    viewport = random.choice(VIEWPORTS)
    browser = await pw.chromium.launch(
        args=[
            f"--remote-debugging-port={cdp_port}",
            "--remote-allow-origins=*",
            "--disable-blink-features=AutomationControlled",
            "--headless=new",
        ],
        headless=False,
    )
    context = await browser.new_context(
        viewport=viewport,
        user_agent=(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/136.0.0.0 Safari/537.36"
        ),
    )
    stealth = Stealth()
    await stealth.apply_stealth_async(context)
    return pw, browser, context, cdp_port


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
