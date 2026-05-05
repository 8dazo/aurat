import pymupdf


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    doc = pymupdf.Document(stream=pdf_bytes)
    text = "\n".join(page.get_text("text") for page in doc)
    if not text.strip():
        raise ValueError("No extractable text found in PDF")
    return text
