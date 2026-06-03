"""Call docling-serve and return structured document data for the pipeline."""

from __future__ import annotations

import logging
import tempfile
from pathlib import Path
from typing import Any

import httpx
import requests

from ..config import settings

logger = logging.getLogger("docling_structure")

_HEADING_LABELS = frozenset({
    "title", "section_header", "page_header", "caption", "footnote",
})


def parse_structured(pdf_bytes: bytes) -> dict[str, Any]:
    """Send PDF bytes to docling-serve; return pages_text, tree, md, etc."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(pdf_bytes)
        tmp_path = Path(tmp.name)

    try:
        raw = _convert_pdf(tmp_path)
        structured = _extract_structure(raw)
        return {
            **structured,
            "pages_text": _extract_pages_text(raw),
            "plain_text": _extract_plain_text(raw),
            "md_content": _extract_markdown(raw),
        }
    finally:
        tmp_path.unlink(missing_ok=True)


def check_health() -> dict:
    base = settings.docling_serve_url.rstrip("/")
    with httpx.Client(timeout=10.0) as client:
        for path in ("/health", "/v1/health", "/"):
            try:
                r = client.get(f"{base}{path}")
                if r.status_code == 200:
                    return {"ok": True, "path": path}
            except httpx.HTTPError:
                continue
    return {"ok": False, "error": f"Not reachable at {base}"}


def _convert_pdf(pdf_path: Path) -> dict:
    url = f"{settings.docling_serve_url.rstrip('/')}/v1/convert/file"
    logger.info("[docling] Sending %s to %s", pdf_path.name, url)
    form = [
        ("from_formats", "pdf"),
        ("to_formats", "json"),
        ("to_formats", "md"),
        ("to_formats", "text"),
        ("do_ocr", "true"),
        ("force_ocr", "false"),
        ("table_mode", "fast"),
        ("do_table_structure", "true"),
        ("pdf_backend", "docling_parse"),
        ("abort_on_error", "false"),
    ]
    with pdf_path.open("rb") as f:
        r = requests.post(
            url,
            files=[("files", (pdf_path.name, f, "application/pdf"))],
            data=form,
            timeout=600.0,
        )
    if r.status_code != 200:
        raise RuntimeError(f"Docling HTTP {r.status_code}: {r.text[:500]}")
    return r.json()


def _unwrap_document(api_response: dict) -> dict:
    if "document" in api_response:
        doc = api_response["document"]
        if isinstance(doc, dict):
            jc = doc.get("json_content")
            if isinstance(jc, dict) and jc:
                return jc
            if doc.get("texts") or doc.get("body"):
                return doc
    if api_response.get("json_content"):
        return api_response["json_content"]
    return api_response


def _page_no(item: dict) -> int | None:
    prov = item.get("prov") or []
    if prov and isinstance(prov[0], dict):
        return prov[0].get("page_no")
    return None


def _extract_structure(api_response: dict) -> dict:
    doc = _unwrap_document(api_response)
    texts = doc.get("texts") or []
    tables = doc.get("tables") or []
    body = doc.get("body") or {}

    headings, sections, paragraphs = [], [], []
    for i, t in enumerate(texts):
        if not isinstance(t, dict):
            continue
        label = (t.get("label") or t.get("type") or "text").lower()
        text = (t.get("text") or t.get("orig") or "").strip()
        if not text:
            continue
        entry = {"index": i, "label": label, "page": _page_no(t), "text_preview": text[:300]}
        if label in _HEADING_LABELS or label.endswith("header"):
            headings.append(entry)
            sections.append({**entry, "role": "heading"})
        else:
            paragraphs.append(entry)

    table_summaries = []
    for j, tbl in enumerate(tables):
        if not isinstance(tbl, dict):
            continue
        data = tbl.get("data") or {}
        cells = (data.get("table_cells") or []) if isinstance(data, dict) else []
        table_summaries.append({
            "index": j,
            "page": _page_no(tbl),
            "label": tbl.get("label", "table"),
            "cell_count": len(cells),
            "num_rows": tbl.get("num_rows"),
            "num_cols": tbl.get("num_cols"),
        })

    hierarchy = _build_hierarchy(body, texts)
    pages = {h.get("page") for h in headings if h.get("page")} | {p.get("page") for p in paragraphs if p.get("page")}

    return {
        "schema_name": doc.get("schema_name"),
        "page_count": len(pages) or None,
        "text_item_count": len(texts),
        "table_count": len(tables),
        "headings": headings,
        "sections": sections,
        "paragraph_count": len(paragraphs),
        "paragraph_samples": paragraphs[:20],
        "tables": table_summaries,
        "hierarchy": hierarchy,
        "status": api_response.get("status"),
        "processing_time": api_response.get("processing_time"),
    }


def _ref_index(ref: str) -> int | None:
    if not ref or "/" not in ref:
        return None
    try:
        return int(ref.rsplit("/", 1)[-1])
    except ValueError:
        return None


def _build_hierarchy(body: dict, texts: list) -> list[dict]:
    ref_map = {t.get("self_ref"): (i, t) for i, t in enumerate(texts) if isinstance(t, dict)}
    nodes = []
    for child in body.get("children") or []:
        ref = child.get("$ref") or child.get("ref") or ""
        idx, item = ref_map.get(ref, (None, {}))
        label = (item.get("label") or "text").lower() if item else ""
        preview = (item.get("text") or item.get("orig") or "")[:120] if item else ""
        nodes.append({
            "ref": ref,
            "index": idx,
            "kind": label or "text",
            "label": label,
            "page": _page_no(item) if item else None,
            "depth": 0,
            "preview": preview,
        })
    return nodes


def _extract_pages_text(api_response: dict) -> list[dict]:
    doc = _unwrap_document(api_response)
    pages: dict[int, list[str]] = {}
    for t in doc.get("texts") or []:
        if not isinstance(t, dict):
            continue
        text = (t.get("text") or t.get("orig") or "").strip()
        if not text:
            continue
        pg = _page_no(t) or 1
        pages.setdefault(pg, []).append(text)
    return [{"page": pg, "text": "\n".join(lines)} for pg, lines in sorted(pages.items())]


def _extract_plain_text(api_response: dict) -> str:
    if isinstance(api_response.get("document"), dict):
        tc = api_response["document"].get("text_content") or ""
        if tc:
            return tc
    doc = _unwrap_document(api_response)
    return "\n".join(
        (t.get("text") or t.get("orig") or "").strip()
        for t in (doc.get("texts") or [])
        if isinstance(t, dict) and (t.get("text") or t.get("orig") or "").strip()
    )


def _extract_markdown(api_response: dict) -> str:
    if isinstance(api_response.get("document"), dict):
        return api_response["document"].get("md_content") or ""
    return ""
