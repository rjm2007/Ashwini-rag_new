"""Deterministic normalization for WARR-1172 warranty schema."""

from __future__ import annotations

import hashlib
import re
from datetime import date
from typing import Any

_MONTHS_RE = re.compile(
    r"(\d+(?:\.\d+)?)\s*(month|months|mo|mos)\b", re.IGNORECASE
)
_DAYS_RE = re.compile(r"(\d+)\s*(day|days)\b", re.IGNORECASE)
_YEARS_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(year|years|yr|yrs)\b", re.IGNORECASE)
_MILES_RE = re.compile(
    r"(\d[\d,]*)\s*(mile|miles|mi)\b", re.IGNORECASE
)
_KM_RE = re.compile(r"(\d[\d,]*)\s*(km|kilometer|kilometers)\b", re.IGNORECASE)
_UNLIMITED_RE = re.compile(r"\bunlimited\b", re.IGNORECASE)


def _slug(value: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", (value or "").strip()).strip("-").upper()
    return s or "UNKNOWN"


def _parse_int(text: str) -> int | None:
    if not text:
        return None
    cleaned = re.sub(r"[^\d]", "", text)
    return int(cleaned) if cleaned else None


def normalize_duration_period(period: dict) -> dict:
    """Fill duration_months / mileage_limit / mileage_unit from duration_text."""
    period = dict(period or {})
    text = str(period.get("duration_text") or "")
    if period.get("duration_months") is None:
        m = _MONTHS_RE.search(text)
        if m:
            period["duration_months"] = int(float(m.group(1)))
        else:
            y = _YEARS_RE.search(text)
            if y:
                period["duration_months"] = int(float(y.group(1)) * 12)
            elif _DAYS_RE.search(text):
                period["duration_months"] = None
    if period.get("mileage_limit") is None and not _UNLIMITED_RE.search(text):
        mi = _MILES_RE.search(text)
        if mi:
            period["mileage_limit"] = _parse_int(mi.group(1))
            period["mileage_unit"] = period.get("mileage_unit") or "miles"
        else:
            km = _KM_RE.search(text)
            if km:
                period["mileage_limit"] = _parse_int(km.group(1))
                period["mileage_unit"] = period.get("mileage_unit") or "km"
    if _UNLIMITED_RE.search(text):
        period["mileage_unit"] = "unlimited"
        if period.get("mileage_limit") is None:
            period["mileage_limit"] = None
    return period


def normalize_coverage_row(row: dict) -> dict:
    out = dict(row)
    out["coverage_period"] = normalize_duration_period(out.get("coverage_period") or {})
    hierarchy = out.get("coverage_hierarchy") or {}
    out["coverage_hierarchy"] = {
        "system": hierarchy.get("system"),
        "subsystem": hierarchy.get("subsystem"),
        "component_group": hierarchy.get("component_group"),
        "component": hierarchy.get("component"),
    }
    for opt in ("limit_of_liability", "deductible", "plan_tier"):
        if opt in out and out[opt] in (None, {}, ""):
            out.pop(opt, None)
    return out


def derive_document_id(schema: dict, filename: str = "") -> str:
    asset = schema.get("asset_context") or {}
    applicability = schema.get("applicability") or {}
    unit = asset.get("unit_number") or ""
    make = applicability.get("make") or asset.get("make") or "DOC"
    if unit:
        return f"WARR-{unit}-{_slug(make)[:12]}-001"
    seed = f"{filename}:{make}"
    h = hashlib.sha1(seed.encode()).hexdigest()[:6].upper()
    return f"WARR-{h}-{_slug(make)[:12]}-001"


def ensure_coverage_ids(rows: list[dict]) -> list[dict]:
    seen: set[str] = set()
    out: list[dict] = []
    for i, row in enumerate(rows):
        r = dict(row)
        cid = (r.get("coverage_id") or "").strip()
        if not cid:
            h = r.get("coverage_hierarchy") or {}
            base = "-".join(
                _slug(x)
                for x in (
                    h.get("system"),
                    h.get("component_group") or h.get("component"),
                    r.get("coverage_name"),
                )
                if x
            )
            cid = f"{base or 'ROW'}-{i+1:02d}"
        while cid in seen:
            cid = f"{cid}-{i+1}"
        seen.add(cid)
        r["coverage_id"] = cid
        out.append(r)
    return out


def normalize_warranty_schema(
    schema: dict,
    *,
    filename: str = "",
    existing_vehicle: dict | None = None,
) -> dict:
    """Apply deterministic normalization and rollups."""
    out = dict(schema)
    existing_vehicle = existing_vehicle or {}

    applicability = dict(out.get("applicability") or {})
    asset = dict(out.get("asset_context") or {})
    for key in ("make", "model", "vin", "chassis_id", "unit_number"):
        if not asset.get(key) and existing_vehicle.get(key):
            asset[key] = existing_vehicle.get(key)
    if not applicability.get("make") and asset.get("make"):
        applicability["make"] = asset["make"]
    if not applicability.get("models") and asset.get("model"):
        applicability["models"] = [asset["model"]]
    out["asset_context"] = asset
    out["applicability"] = applicability

    rows = [normalize_coverage_row(r) for r in (out.get("coverage_components") or []) if isinstance(r, dict)]
    rows = ensure_coverage_ids(rows)
    out["coverage_components"] = rows

    scores = [float(r.get("confidence_score") or 0) for r in rows if r.get("confidence_score") is not None]
    doc = dict(out.get("document") or {})
    doc.setdefault("extraction_date", date.today().isoformat())
    doc["document_id"] = doc.get("document_id") or derive_document_id(out, filename)
    doc["extraction_confidence"] = round(sum(scores) / len(scores), 3) if scores else doc.get("extraction_confidence")
    if filename and not doc.get("source_file"):
        doc["source_file"] = filename
    out["document"] = doc

    out["rag_metadata"] = {
        "recommended_chunking": "one_chunk_per_coverage_component",
        "primary_filters": [
            "make", "model", "vin", "asset_category", "system", "subsystem",
            "component_group", "coverage_id", "coverage_type", "mileage_limit", "mileage_unit",
        ],
    }
    return out


def compute_required_fields_missing(schema: dict) -> bool:
    applicability = schema.get("applicability") or {}
    make = applicability.get("make")
    models = applicability.get("models") or []
    coverage = schema.get("coverage_components") or []
    if not make:
        return True
    if not models and not (schema.get("asset_context") or {}).get("model"):
        return True
    if len(coverage) == 0:
        return True
    return False


def compute_completeness(schema: dict) -> float:
    rows = schema.get("coverage_components") or []
    if not rows:
        return 0.0
    filled = sum(1 for r in rows if r.get("coverage_id") and r.get("coverage_name"))
    return round(filled / max(len(rows), 1), 3)
