import marimo

__generated_with = "0.11.0"
app = marimo.App()


@app.cell
def _():
    import marimo as mo
    from db.jobs_client import get_jobs, get_job_filters
    import asyncio

    mo, get_jobs, get_job_filters, asyncio


@app.cell
def _(mo):
    query_input = mo.ui.text(value="", label="Search")
    page_size = mo.ui.number(value=10, start=1, stop=100, label="Page size")
    run_btn = mo.ui.run_button(label="Fetch Jobs")
    query_input, page_size, run_btn


@app.cell
def _(run_btn, query_input, page_size, get_jobs, asyncio, mo):
    jobs = None
    if run_btn.value:
        params = {"pageSize": page_size.value}
        if query_input.value:
            params["search"] = query_input.value
        jobs = asyncio.run(get_jobs(params))
    mo.ui.table(jobs["jobs"] if jobs else [])


@app.cell
def _(get_job_filters, asyncio, mo):
    filters = asyncio.run(get_job_filters())
    mo.ui.table(filters if isinstance(filters, list) else [filters])
