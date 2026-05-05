import marimo

__generated_with = "0.11.0"
app = marimo.App()


@app.cell
def _():
    import marimo as mo
    from agents.greenhouse import GreenhouseAgent
    from utils.stealth import create_stealth_browser
    import asyncio
    import json

    mo, GreenhouseAgent, create_stealth_browser, asyncio, json


@app.cell
def _(mo):
    job_url = mo.ui.text(value="", label="Job URL")
    run_btn = mo.ui.run_button(label="Run Agent")
    job_url, run_btn


@app.cell
def _(job_url, run_btn, GreenhouseAgent, create_stealth_browser, asyncio, json, mo):
    steps = []

    def on_step(step):
        steps.append(step)

    async def run_agent(url):
        agent = GreenhouseAgent(
            {"personal_info": {"first_name": "Test", "last_name": "User"}}
        )
        pw, browser, context = await create_stealth_browser()
        try:
            page = await context.new_page()
            await page.goto(url, wait_until="networkidle", timeout=30000)
            await agent.run(page, on_step=on_step)
        finally:
            await browser.close()
            await pw.stop()
        return agent.steps_log

    log_output = None
    if run_btn.value and job_url.value:
        log_output = asyncio.run(run_agent(job_url.value))

    mo.md(
        "\n".join(
            f"- `{s['step']}`: {s['status']} {s.get('detail', '')}"
            for s in (log_output or [])
        )
    )
