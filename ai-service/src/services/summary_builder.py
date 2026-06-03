"""Transform master_schema_json into UI-friendly summary payload."""

from __future__ import annotations


def build_summary(master_schema: dict, document_id: str, filename: str) -> dict:
    doc_type = _fw_value((master_schema.get("document") or {}).get("document_type")) or "generic_document"
    quality = master_schema.get("quality", {})
    sections = []

    doc_fields = _extract_field_rows(master_schema.get("document", {}), exclude={"document_type"})
    if doc_fields:
        sections.append({"id": "document", "title": "Document", "icon": "FileText", "kind": "fields", "fields": doc_fields})

    vehicle_fields = _extract_field_rows(master_schema.get("vehicle", {}))
    if vehicle_fields:
        sections.append({"id": "vehicle", "title": "Vehicle", "icon": "Truck", "kind": "fields", "fields": vehicle_fields})

    profiles = master_schema.get("profiles", {}) or {}
    active_profile = profiles.get(doc_type, {}) or {}
    if doc_type == "warranty_certificate":
        sections.append(_build_warranty_section(active_profile))
    elif doc_type == "coverage_code_table":
        sections.append(_build_code_table_section(active_profile))
    elif doc_type == "repair_invoice":
        sections.append(_build_invoice_section(active_profile))
    elif active_profile:
        sections.append({
            "id": "profile",
            "title": "Extracted Content",
            "icon": "FileText",
            "kind": "fields",
            "fields": _extract_field_rows(active_profile),
        })

    extensions = master_schema.get("extensions", [])
    if extensions:
        sections.append({
            "id": "extensions",
            "title": "Additional Sections",
            "icon": "Layers",
            "kind": "accordion",
            "fields": extensions,
        })

    return {
        "document_id": document_id,
        "filename": filename,
        "document_type": doc_type,
        "completeness": {
            "overall": quality.get("overall_completeness", 0),
            "extracted": quality.get("fields_extracted", 0),
            "missing": quality.get("fields_missing", 0),
            "low_confidence": quality.get("fields_low_confidence", 0),
        },
        "sections": sections,
    }


def _fw_value(fw: object):
    if isinstance(fw, dict):
        return fw.get("value")
    return None


def _extract_field_rows(obj: dict, exclude: set | None = None) -> list[dict]:
    rows = []
    exclude = exclude or set()
    for key, val in (obj or {}).items():
        if key in exclude or key.startswith("_"):
            continue
        if isinstance(val, dict) and "status" in val and "value" in val:
            rows.append({"key": key, "label": key.replace("_", " ").title(), "wrapper": val})
    return rows


def _build_warranty_section(profile: dict) -> dict:
    cs = profile.get("coverage_summary", {}) or {}
    return {
        "id": "profile",
        "title": "Warranty Coverage",
        "icon": "ShieldCheck",
        "kind": "warranty",
        "coverage_summary": _extract_field_rows(cs),
        "covered_components": profile.get("covered_components", []),
        "exclusions": profile.get("exclusions", []),
        "towing": _extract_field_rows(profile.get("towing", {}) or {}),
        "claim_procedure": _fw_value(profile.get("claim_procedure")),
        "fuel_def_requirements": _fw_value(profile.get("fuel_def_requirements")),
    }


def _build_code_table_section(profile: dict) -> dict:
    return {
        "id": "profile",
        "title": "Coverage Codes",
        "icon": "Table",
        "kind": "code_table",
        "coverage_codes": profile.get("coverage_codes", []),
    }


def _build_invoice_section(profile: dict) -> dict:
    skip = {"line_items", "totals"}
    return {
        "id": "profile",
        "title": "Invoice",
        "icon": "Receipt",
        "kind": "invoice",
        "header_fields": _extract_field_rows({k: v for k, v in profile.items() if k not in skip}),
        "line_items": profile.get("line_items", []),
        "totals": _extract_field_rows(profile.get("totals", {}) or {}),
    }
