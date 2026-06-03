"""Parse Docling JSON export into sections, headings, hierarchy, tables."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger("structure_parser")

# Docling text labels that act as headings (DoclingDocument schema)
HEADING_LABELS = frozenset(
    {
        "title",
        "section_header",
        "page_header",
        "caption",
        "footnote",
    }
)


def _unwrap_document(api_response: dict) -> dict:
    """Normalize docling-serve response to inner document dict."""
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
    if api_response.get("texts") or api_response.get("body"):
        return api_response
    return api_response


def _page_no(item: dict) -> int | None:
    prov = item.get("prov") or []
    if prov and isinstance(prov[0], dict):
        return prov[0].get("page_no")
    return None


def extract_structure(api_response: dict) -> dict[str, Any]:
    """
    Build a human-readable structure report from docling-serve output.
    """
    doc = _unwrap_document(api_response)
    texts = doc.get("texts") or []
    tables = doc.get("tables") or []
    body = doc.get("body") or {}

    headings: list[dict] = []
    sections: list[dict] = []
    paragraphs: list[dict] = []
    table_summaries: list[dict] = []

    for i, t in enumerate(texts):
        if not isinstance(t, dict):
            continue
        label = (t.get("label") or t.get("type") or "text").lower()
        text = (t.get("text") or t.get("orig") or "").strip()
        if not text:
            continue
        entry = {
            "index": i,
            "label": label,
            "page": _page_no(t),
            "text_preview": text[:200] + ("..." if len(text) > 200 else ""),
        }
        if label in HEADING_LABELS or label.endswith("header"):
            headings.append(entry)
            sections.append({**entry, "role": "heading"})
        else:
            paragraphs.append(entry)

    for j, tbl in enumerate(tables):
        if not isinstance(tbl, dict):
            continue
        cells = 0
        data = tbl.get("data") or tbl.get("table_cells") or []
        if isinstance(data, list):
            cells = len(data)
        elif isinstance(data, dict):
            cells = len(data.get("table_cells") or data.get("cells") or [])
        table_summaries.append(
            {
                "index": j,
                "page": _page_no(tbl),
                "label": tbl.get("label", "table"),
                "cell_count": cells,
                "num_rows": tbl.get("num_rows"),
                "num_cols": tbl.get("num_cols"),
            }
        )

    hierarchy = _build_hierarchy(body, texts)

    md_content = ""
    text_content = ""
    if isinstance(api_response.get("document"), dict):
        d = api_response["document"]
        md_content = d.get("md_content") or ""
        text_content = d.get("text_content") or ""

    return {
        "schema_name": doc.get("schema_name"),
        "name": doc.get("name"),
        "page_count": len({h.get("page") for h in headings if h.get("page")} | {p.get("page") for p in paragraphs if p.get("page")}) or None,
        "text_item_count": len(texts),
        "table_count": len(tables),
        "headings": headings,
        "sections": sections,
        "paragraph_count": len(paragraphs),
        "paragraph_samples": paragraphs[:15],
        "tables": table_summaries,
        "hierarchy": hierarchy,
        "md_chars": len(md_content),
        "plain_text_chars": len(text_content),
        "status": api_response.get("status"),
        "processing_time": api_response.get("processing_time"),
    }


def _build_hierarchy(body: dict, texts: list) -> list[dict]:
    """Walk body.children refs when present; else flatten by label."""
    children = body.get("children") or []
    if not children:
        return [
            {"depth": 0, "label": t.get("label"), "text": (t.get("text") or "")[:120]}
            for t in texts[:40]
            if isinstance(t, dict) and (t.get("text") or "").strip()
        ]

    out: list[dict] = []

    def walk(node: dict, depth: int) -> None:
        if not isinstance(node, dict):
            return
        ref = node.get("$ref") or node.get("cref") or ""
        label = node.get("label", "")
        out.append({"depth": depth, "ref": ref, "label": label})
        for child in node.get("children") or []:
            walk(child, depth + 1)

    if isinstance(children, list):
        for ch in children[:50]:
            walk(ch, 0)
    return out[:60]
