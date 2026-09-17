from pathlib import Path
from pypdf import PdfReader
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

def extract_pdf_text(pdf_path: str) -> str:
    """
    Extracts text from all pages of a PDF file.

    Args:
        pdf_path (str): Path to the PDF file.

    Returns:
        str: Concatenated text from all pages.

    Raises:
        FileNotFoundError: If the PDF file does not exist.
        ValueError: If no extractable text is found.
    """
    path = Path(pdf_path)

    if not path.exists():
        logging.error("PDF not found: %s", path)
        raise FileNotFoundError(f"PDF not found: {path}")

    reader = PdfReader(str(path))
    pages: list[str] = []

    for i, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        if not text.strip():
            logging.warning("No text extracted from page %d", i)
        pages.append(text)

    if not any(pages):
        raise ValueError(f"No extractable text found in PDF: {path}")

    logging.info("Successfully extracted text from %d pages", len(pages))
    return "\n".join(pages)


def clean_text(text: str) -> str:
    """
    Cleans formatting artifacts from PDF extraction
    without altering the actual information.

    Args:
        text (str): Raw text extracted from PDF.

    Returns:
        str: Cleaned text with collapsed spaces and trimmed lines.
    """
    lines: list[str] = []

    for line in text.splitlines():
        # Collapse repeated spaces created by PDF extraction
        cleaned = " ".join(line.split())
        if cleaned:
            lines.append(cleaned)

    logging.info("Cleaned text with %d lines retained", len(lines))
    return "\n".join(lines)
