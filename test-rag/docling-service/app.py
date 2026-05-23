"""
app.py — Lightweight FastAPI wrapper around IBM Docling for PDF-to-text extraction.

Runs inside a Docker container so the test-rag pipeline (and later ai-service)
can call it via REST instead of requiring a local pip install + 1GB model download.

Endpoints:
  GET  /health          → {"status": "ok"}
  POST /convert         → Upload a PDF, get per-page text back as JSON

The converter is initialized once at startup (model loading takes ~20-30s on
first cold start, then stays warm in memory).
"""

import logging
import os
import tempfile
import time

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
)
logger = logging.getLogger("docling-api")

app = FastAPI(title="Docling PDF Service", version="1.0.0")

# ── Lazy-load the converter on first request (or at startup) ────
_converter = None


def get_converter():
    """Return the singleton DocumentConverter, initializing on first call."""
    global _converter
    if _converter is None:
        logger.info("Initializing Docling DocumentConverter (first call, loading models)...")
        t0 = time.time()
        from docling.document_converter import DocumentConverter
        _converter = DocumentConverter()
        logger.info("DocumentConverter ready in %.1fs", time.time() - t0)
    return _converter


@app.on_event("startup")
async def warmup():
    """Pre-load models at container startup so the first request is fast."""
    try:
        get_converter()
        logger.info("Docling models pre-loaded successfully")
    except Exception as e:
        logger.warning("Docling warmup failed (will retry on first request): %s", e)


@app.get("/health")
async def health():
    """Health check — returns ok if the service is running."""
    return {"status": "ok", "converter_loaded": _converter is not None}


@app.post("/convert")
async def convert_pdf(file: UploadFile = File(...)):
    """
    Convert an uploaded PDF to per-page text using Docling.

    Accepts: multipart/form-data with a 'file' field containing a PDF.

    Returns:
    {
        "pages": [{"page": 1, "text": "..."}, {"page": 2, "text": "..."}, ...],
        "total_pages": 5,
        "total_chars": 12345,
        "elapsed_seconds": 3.2
    }
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    # Read uploaded file into a temp file (Docling needs a file path)
    content = await file.read()
    if len(content) < 100:
        raise HTTPException(status_code=400, detail="File is too small to be a valid PDF")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        t0 = time.time()
        converter = get_converter()

        logger.info("Converting %s (%d bytes)", file.filename, len(content))
        result = converter.convert(tmp_path)
        doc = result.document

        # ── Extract per-page text from Docling's document model ──
        pages = _extract_pages(doc)

        elapsed = round(time.time() - t0, 2)
        total_chars = sum(len(p["text"]) for p in pages)

        logger.info(
            "Converted %s → %d pages, %d chars in %.1fs",
            file.filename, len(pages), total_chars, elapsed,
        )

        return JSONResponse(content={
            "pages": pages,
            "total_pages": len(pages),
            "total_chars": total_chars,
            "elapsed_seconds": elapsed,
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Conversion failed for %s: %s", file.filename, e)
        raise HTTPException(status_code=500, detail=f"PDF conversion failed: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


def _extract_pages(doc) -> list[dict]:
    """
    Extract per-page text from a Docling Document object.

    Uses the item-level provenance to group text by page number.
    Falls back to full markdown as a single page if provenance isn't available.
    """
    page_texts: dict[int, list[str]] = {}

    try:
        for item, _level in doc.iterate_items():
            text = ""
            if hasattr(item, "export_to_markdown"):
                text = item.export_to_markdown()
            elif hasattr(item, "text"):
                text = str(item.text)
            else:
                text = str(item)

            if not text or not text.strip():
                continue

            # Get page number from provenance metadata
            page_no = 1
            if hasattr(item, "prov") and item.prov:
                for prov in item.prov:
                    if hasattr(prov, "page_no"):
                        page_no = prov.page_no
                        break

            page_texts.setdefault(page_no, []).append(text.strip())

    except Exception as e:
        logger.warning("Per-item extraction failed (%s), using full markdown", e)

    if page_texts:
        return [
            {"page": pg, "text": "\n\n".join(texts)}
            for pg, texts in sorted(page_texts.items())
        ]

    # Fallback: full markdown as one page
    try:
        full_md = doc.export_to_markdown()
        if full_md and full_md.strip():
            return [{"page": 1, "text": full_md.strip()}]
    except Exception as e:
        logger.warning("Full markdown export also failed: %s", e)

    return []
