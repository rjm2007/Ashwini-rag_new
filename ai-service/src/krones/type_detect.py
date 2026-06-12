"""Lightweight Krones document_type detection from filename + first-page text."""

from __future__ import annotations

import re

_MARKERS = [
    (re.compile(r"supplier\s+handbook", re.I), "handbook"),
    (re.compile(r"\bLTSD\b|long[- ]term\s+supplier\s+declaration", re.I), "supplier_declaration_instructions"),
    (re.compile(r"ticket\s+management|supplier\s+requests\s+service\s+management|SRSM", re.I), "ticket_system_guide"),
]

_FILENAME_KRONES = re.compile(r"krones|ltsd|srsm|supplier\s+handbook", re.I)


def detect_krones_from_text(filename: str, text_sample: str) -> str | None:
    """Return krones_supplier_doc if markers match, else None."""
    combined = f"{filename}\n{text_sample[:4000]}"
    if not _FILENAME_KRONES.search(filename) and "Krones" not in text_sample[:2000]:
        return None
    return "krones_supplier_doc"


def infer_doc_category(filename: str, text_sample: str) -> str:
    combined = f"{filename}\n{text_sample[:3000]}"
    for pat, cat in _MARKERS:
        if pat.search(combined):
            return cat
    return "handbook"
