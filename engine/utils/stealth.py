from playwright.async_api import async_playwright
from playwright_stealth import Stealth


async def create_stealth_browser():
    pw = await async_playwright().start()
    browser = await pw.chromium.launch(
        args=[
            "--remote-debugging-port=0",
            "--disable-blink-features=AutomationControlled",
        ],
        headless=False,
    )
    context = await browser.new_context()
    stealth = Stealth()
    await stealth.apply_stealth_async(context)
    return pw, browser, context


async def check_browser_installed() -> str | None:
    try:
        from playwright._impl._driver import compute_driver_executable
        import subprocess

        driver = compute_driver_executable()
        result = subprocess.run(
            [str(driver), "install", "--dry-run", "chromium"],
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

        driver = compute_driver_executable()
        result = subprocess.run(
            [str(driver), "install", "chromium"],
            capture_output=True,
            text=True,
            timeout=300,
        )
        if result.returncode == 0:
            return {"status": "installed", "browser": "chromium"}
        return {"status": "error", "message": result.stderr or result.stdout}
    except Exception as e:
        return {"status": "error", "message": str(e)}
