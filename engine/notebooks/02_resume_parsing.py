import marimo

__generated_with = "0.11.0"
app = marimo.App()


@app.cell
def _():
    import marimo as mo
    import asyncio
    from parsers.pdf_extract import extract_text_from_pdf
    from parsers.llm_structured import extract_profile

    mo, extract_text_from_pdf, extract_profile, asyncio


@app.cell
def _():
    pdf_input = mo.ui.file(filetypes=[".pdf"], label="Upload Resume PDF")
    pdf_input


@app.cell
def _(extract_text_from_pdf, mo, pdf_input):
    extracted_text = ""
    if pdf_input.value:
        pdf_bytes = pdf_input.value[0].contents
        try:
            extracted_text = extract_text_from_pdf(bytes(pdf_bytes))
        except Exception as e:
            extracted_text = f"Error: {e}"
    mo.md(
        f"**Extracted Text:**\n\n{extracted_text[:3000]}"
    ) if extracted_text else mo.md("Upload a PDF to extract text")


@app.cell
def _(asyncio, extract_profile, extracted_text, mo):
    profile_result = None
    if extracted_text and not extracted_text.startswith("Error"):
        profile_result = await extract_profile(extracted_text)
    mo.md(
        f"**MasterProfile:**\n\n```json\n{profile_result.model_dump_json(indent=2)}\n```"
    ) if profile_result else mo.md("No profile extracted yet")
