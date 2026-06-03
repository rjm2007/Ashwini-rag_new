#!/usr/bin/env python3
"""
Extract a local PDF via docling-serve and write a human-readable report.

Usage (from warranty-platform/docling-ingest/):
  python extract_pdf.py "C:\\Users\\rudra\\Desktop\\Waranty_POC\\1172 WARRENTY.pdf"

Requires docling-service on port 5001:
  docker compose -f docker-compose.docling.yml up -d
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# Allow imports from bridge/
sys.path.insert(0, str(Path(__file__).resolve().parent / "bridge"))

from docling_client import check_health, convert_pdf  # noqa: E402
from structure_parser import extract_structure  # noqa: E402

DOCLING_URL = "http://localhost:5001"
OUTPUT_DIR = Path(__file__).resolve().parent / "output"


def format_report(pdf_name: str, report: dict, raw: dict) -> str:
    lines = [
        "=" * 78,
        f"DOCLING EXTRACTION REPORT — {pdf_name}",
        "=" * 78,
        "",
        "PIPELINE",
        "  PDF -> docling-serve (CPU, port 5001) -> structured JSON -> this report",
        "",
        "SUMMARY",
        f"  API status:          {report.get('status') or raw.get('status')}",
        f"  Processing time (s): {report.get('processing_time') or raw.get('processing_time')}",
        f"  Schema:              {report.get('schema_name')}",
        f"  Text items:          {report.get('text_item_count')}",
        f"  Tables detected:     {report.get('table_count')}",
        f"  Headings/sections:   {len(report.get('headings', []))}",
        f"  Markdown chars:      {report.get('md_chars')}",
        f"  Plain text chars:    {report.get('plain_text_chars')}",
        "",
        "HEADINGS / SECTIONS",
        "-" * 78,
    ]
    if not report.get("headings"):
        lines.append("  (none labeled as section_header/title — see paragraph samples)")
    for h in report.get("headings", []):
        lines.append(f"  [p{h.get('page')}] {h.get('label')}: {h.get('text_preview')}")

    lines.extend(["", "TABLES", "-" * 78])
    if not report.get("tables"):
        lines.append("  (no structured tables in JSON export)")
    for t in report.get("tables", []):
        lines.append(
            f"  Table #{t.get('index')} page={t.get('page')} "
            f"rows={t.get('num_rows')} cols={t.get('num_cols')} cells={t.get('cell_count')}"
        )

    lines.extend(["", "DOCUMENT HIERARCHY (body tree / text order)", "-" * 78])
    for node in report.get("hierarchy", [])[:40]:
        indent = "  " + ("  " * int(node.get("depth") or 0))
        lbl = node.get("label") or "text"
        txt = (node.get("text") or node.get("ref") or "")[:100]
        lines.append(f"{indent}{lbl}: {txt}")

    lines.extend(["", "SAMPLE PARAGRAPHS (first 15)", "-" * 78])
    for p in report.get("paragraph_samples", []):
        lines.append(f"  [p{p.get('page')}] {p.get('label')}: {p.get('text_preview')}")

    # Include OCR-related note from conversion options
    lines.extend(
        [
            "",
            "OCR / PROCESSING (Docling defaults used)",
            "-" * 78,
            "  do_ocr=true, table_mode=fast, pdf_backend=docling_parse",
            "  do_table_structure=true — tables extracted when present",
            "  CPU only (no GPU) — official quay.io/docling-project/docling-serve image",
            "",
            "=" * 78,
        ]
    )
    return "\n".join(lines)


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python extract_pdf.py <path-to.pdf>")
        return 1

    pdf_path = Path(sys.argv[1]).resolve()
    if not pdf_path.is_file():
        print(f"File not found: {pdf_path}")
        return 1

    health = check_health(DOCLING_URL)
    if not health.get("ok"):
        print(f"Docling not ready at {DOCLING_URL}: {health}")
        print("Start: docker compose -f docker-compose.docling.yml up -d")
        return 1

    print(f"Docling healthy ({health.get('path')}). Converting {pdf_path.name}...")
    print("(First run may take 2-5 minutes while models load.)\n")

    raw = convert_pdf(pdf_path, base_url=DOCLING_URL)
    report = extract_structure(raw)
    text = format_report(pdf_path.name, report, raw)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    stem = pdf_path.stem.replace(" ", "_")
    txt_out = OUTPUT_DIR / f"{stem}_docling_report.txt"
    json_out = OUTPUT_DIR / f"{stem}_docling_raw.json"

    txt_out.write_text(text, encoding="utf-8")
    json_out.write_text(json.dumps({"report": report, "raw": raw}, indent=2, default=str), encoding="utf-8")

    print(text)
    print(f"\nSaved: {txt_out}")
    print(f"Saved: {json_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
