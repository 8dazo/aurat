import marimo

__generated_with = "0.11.0"
app = marimo.App()


@app.cell
def _():
    import marimo as mo
    import asyncio
    from playwright.async_api import async_playwright

    mo, asyncio, async_playwright


@app.cell
def _(mo):
    url_input = mo.ui.text(value="https://example.com", label="Target URL")
    headless_toggle = mo.ui.checkbox(value=True, label="Headless")
    url_input, headless_toggle


@app.cell
def _(url_input, headless_toggle, async_playwright, mo):
    async def take_screenshot(url, headless):
        pw = await async_playwright().start()
        browser = await pw.chromium.launch(headless=headless)
        page = await browser.new_page()
        await page.goto(url, wait_until="networkidle", timeout=30000)
        screenshot = await page.screenshot(full_page=True)
        await browser.close()
        await pw.stop()
        return screenshot

    if url_input.value:
        img = asyncio.run(take_screenshot(url_input.value, headless_toggle.value))
        mo.image(img)
