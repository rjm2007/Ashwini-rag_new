"""Krones-specific text cleaning before chunking / extraction."""

from __future__ import annotations

import re

_HEADER_FOOTER_PATTERNS = [
    re.compile(r"Krones Supplier Handbook\s*\|\s*\d+", re.I),
    re.compile(r"KRONES Long Term Supplier Declaration\s*\(LTSD\)", re.I),
    re.compile(r"\d+\s*\|\s*Krones Corporate Quality Management", re.I),
    re.compile(r"^\s*Internal\s*$", re.M),
    re.compile(r"^\s*\d{1,2}\s*$", re.M),
]

_BULLET_NORMALIZE = re.compile(r"[—‒–•]\s*")
_HYPHEN_BREAK = re.compile(r"(\w)-\n(\w)")
_SECTION_SPLIT = re.compile(r"(?=\b3\.\d{1,2}\b)")


def _strip_headers_footers(text: str) -> str:
    out = text
    for pat in _HEADER_FOOTER_PATTERNS:
        out = pat.sub("", out)
    return out


def _normalize_bullets(text: str) -> str:
    text = _BULLET_NORMALIZE.sub("- ", text)
    return _HYPHEN_BREAK.sub(r"\1\2", text)


def _skip_decorative_pages(pages_text: list[dict], min_chars: int = 80) -> list[dict]:
    """Drop very low-text pages (likely full-bleed photos)."""
    kept: list[dict] = []
    for page in pages_text or []:
        text = (page.get("text") or "").strip()
        if len(text) >= min_chars:
            kept.append(page)
    return kept if kept else list(pages_text or [])


def apply_krones_cleaning(structured: dict) -> dict:
    """Return a copy of structured docling output with Krones cleaning applied."""
    result = dict(structured)
    for key in ("plain_text", "md_content", "readable_text", "tables_text"):
        if result.get(key):
            t = _strip_headers_footers(str(result[key]))
            result[key] = _normalize_bullets(t)

    pages = result.get("pages_text") or []
    pages = _skip_decorative_pages(pages)
    result["pages_text"] = pages
    if pages:
        result["plain_text"] = "\n".join(p.get("text", "") for p in pages)

    return result
