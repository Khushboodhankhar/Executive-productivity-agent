from pathlib import Path
from pdf_reader import extract_pdf_text, clean_text
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

def main() -> None:
    """
    Extracts text from a PDF, cleans it, and saves to a file.
    """
    pdf_path = (
        Path(__file__).resolve().parents[2]
        / "data"
        / "Assignment 1_DataPack_ExecutiveProductivityAgent.pdf"
    )

    output_path = (
        Path(__file__).resolve().parents[2]
        / "data"
        / "datapack_cleaned.txt"
    )

    try:
        logging.info("Reading PDF: %s", pdf_path)
        raw_text: str = extract_pdf_text(str(pdf_path))
        cleaned_text: str = clean_text(raw_text)

        output_path.write_text(cleaned_text, encoding="utf-8")
        logging.info("Cleaned text written to: %s", output_path)

        print("=" * 60)
        print("PDF PROCESSED SUCCESSFULLY")
        print("=" * 60)
        print(f"Characters extracted: {len(raw_text)}")
        print(f"Characters after cleaning: {len(cleaned_text)}")
        print(f"Saved to: {output_path}")
        print("=" * 60)

    except FileNotFoundError as e:
        logging.error("File not found: %s", e)
        print("❌ PDF file could not be located.")
    except ValueError as e:
        logging.error("No extractable text: %s", e)
        print("⚠️ PDF contains no readable text.")
    except Exception as e:
        logging.exception("Unexpected error occurred")
        print(f"❌ An unexpected error occurred: {e}")

if __name__ == "__main__":
    main()
