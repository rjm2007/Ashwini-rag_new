"""
Docling ingestion bridge — FastAPI utility for PDF → structured document tree.

Architecture:
  PDF upload → docling-serve (port 5001) → structured JSON → logged summary

No embeddings, vector DB, LangChain, or retrieval.
"""

from __future__ import annotations

import json
import logging
import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from docling_client import check_health, convert_pdf
from structure_parser import extract_structure

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
)
logger = logging.getLogger("docling-bridge")

DOCLING_URL = os.environ.get("DOCLING_URL", "http://localhost:5001")

app = FastAPI(
    title="Docling Ingestion Bridge",
    version="1.0.0",
    description="Forwards PDFs to docling-serve and returns sections/headings/tables.",
)


@app.get("/health")
async def health():
    docling = check_health(DOCLING_URL)
    return {
        "status": "ok" if docling.get("ok") else "degraded",
        "docling_url": DOCLING_URL,
        "docling": docling,
    }


@app.post("/ingest/pdf")
async def ingest_pdf(file: UploadFile = File(...)):
    """
    Accept PDF, send to Docling, return structured extraction report.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files supported")

    content = await file.read()
    if len(content) < 100:
        raise HTTPException(400, "File too small")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        raw = convert_pdf(tmp_path, base_url=DOCLING_URL)
        report = extract_structure(raw)

        logger.info("=== Docling extraction: %s ===", file.filename)
        logger.info("Status: %s | processing_time: %s", report.get("status"), report.get("processing_time"))
        logger.info("Texts: %s | Tables: %s | Headings: %s", report.get("text_item_count"), report.get("table_count"), len(report.get("headings", [])))
        for h in report.get("headings", [])[:20]:
            logger.info("  HEADING p%s [%s]: %s", h.get("page"), h.get("label"), h.get("text_preview"))
        for t in report.get("tables", [])[:10]:
            logger.info("  TABLE p%s: rows=%s cols=%s cells=%s", t.get("page"), t.get("num_rows"), t.get("num_cols"), t.get("cell_count"))
        for node in report.get("hierarchy", [])[:15]:
            logger.info("  TREE depth=%s label=%s ref=%s", node.get("depth"), node.get("label"), node.get("ref", "")[:40])

        return JSONResponse(
            {
                "filename": file.filename,
                "docling_url": DOCLING_URL,
                "report": report,
                "raw_status": raw.get("status"),
                "processing_time_seconds": raw.get("processing_time"),
            }
        )
    except FileNotFoundError as e:
        raise HTTPException(404, str(e)) from e
    except RuntimeError as e:
        logger.exception("Docling conversion failed")
        raise HTTPException(502, str(e)) from e
    finally:
        if tmp_path and Path(tmp_path).exists():
            Path(tmp_path).unlink(missing_ok=True)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=5010)
