import marimo

__generated_with = "0.11.0"
app = marimo.App()


@app.cell
def _():
    import marimo as mo
    from fastapi.testclient import TestClient
    from main import app as fastapi_app

    client = TestClient(fastapi_app)
    mo, client


@app.cell
def _(client):
    response = client.get("/health")
    response.json()


@app.cell
def _(client):
    response = client.get("/jobs/filters")
    response.json()


@app.cell
def _(client):
    response = client.get("/jobs", params={"pageSize": 5})
    response.json()


@app.cell
def _(client):
    import io

    sample_pdf = io.BytesIO(b"%PDF-1.4 dummy")
    response = client.post(
        "/extract", files={"file": ("test.pdf", sample_pdf, "application/pdf")}
    )
    response.status_code, response.json()
