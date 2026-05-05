import marimo

__generated_with = "0.11.0"
app = marimo.App()


@app.cell
def _():
    import marimo as mo
    from llm.client import LLMClient
    from models.profile import MasterProfile
    import asyncio
    import time

    mo, LLMClient, MasterProfile, asyncio, time


@app.cell
def _(mo):
    model_select = mo.ui.dropdown(
        options={"Local (gpt-oss)": "local", "Cloud (gpt-oss:120b-cloud)": "cloud"},
        value="Local (gpt-oss)",
        label="Model",
    )
    text_input = mo.ui.text_area(
        value="John Doe, Software Engineer with 5 years of Python experience.",
        label="Sample resume text",
    )
    run_btn = mo.ui.run_button(label="Extract")
    model_select, text_input, run_btn


@app.cell
def _(model_select, text_input, run_btn, LLMClient, MasterProfile, asyncio, time, mo):
    result = None
    latency = None
    if run_btn.value and text_input.value:
        client = LLMClient()
        start = time.time()
        result = asyncio.run(
            client.extract_structured(
                "Extract a structured profile from this resume.",
                MasterProfile,
                text_input.value,
            )
        )
        latency = time.time() - start
    (
        mo.md(
            f"**Latency:** {latency:.2f}s" if latency else mo.md("Press Extract to run")
        )
        if result
        else mo.md("Press Extract to run")
    )


@app.cell
def _(result, mo):
    mo.md(
        f"**Result:**\n\n```json\n{result.model_dump_json(indent=2) if result else 'No result'}\n```"
    )
