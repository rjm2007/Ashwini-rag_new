"""Krones required-fields gate (doc_title + issuer + doc_category)."""

from __future__ import annotations


def _fw_val(fw: object) -> str | None:
    if isinstance(fw, dict):
        v = fw.get("value")
        if v is not None and str(v).strip():
            return str(v).strip()
    return None


def has_krones_required_fields(document: dict) -> bool:
    """True when doc_title, issuer, and doc_category are all present."""
    return bool(
        _fw_val(document.get("doc_title"))
        and _fw_val(document.get("issuer"))
        and _fw_val(document.get("doc_category"))
    )
