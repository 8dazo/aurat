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
