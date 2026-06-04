"""
schema_extraction_service.py — Per-section extraction pipeline.

Each classified section group gets its own focused LLM call.
Intermediate outputs are stored in documents.section_extracts_json.
Final merged output is documents.master_schema_json.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any

from sqlalchemy import text

from ..config import settings
from ..database import SessionLocal
from ..services.llm_service import LlmService

logger = logging.getLogger("schema_extraction")

_PROMPT_DIR = Path(__file__).resolve().parent.parent / "prompts"


def _parse_json(raw: str) -> dict:
    s = raw.strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s)
        s = re.sub(r"\s*```$", "", s)
    return json.loads(s.strip())


def _fw_value(fw: object) -> Any:
    if isinstance(fw, dict):
        return fw.get("value")
    return None


def _clean_text(text: str) -> str:
    if not text:
        return ""
    cleaned = re.sub(r"!\[[^\]]*\]\(data:image[^)]+\)", "", text, flags=re.IGNORECASE)
    return re.sub(r"\n{3,}", "\n\n", cleaned).strip()


# ─── Section groupings per document type ──────────────────────────────────────

# Maps (document_type, section_label) → which extraction module to call
# and what field schema to target. Each entry = one LLM call.
SECTION_EXTRACTION_MAP: dict[str, list[dict]] = {
    "warranty_certificate": [
        {
            "name": "vehicle_identification",
            "labels": ["vehicle_identification", "issuer_metadata"],
            "prompt_file": "extract_vehicle.txt",
            "fields": "make, model, model_year, vin, chassis_id, in_service_date, engine_family",
            "event_label": "Extracting: Vehicle & issuer details",
        },
        {
            "name": "coverage_summary",
            "labels": ["coverage_clause"],
            "prompt_file": "extract_coverage.txt",
            "fields": "base_duration, base_distance, major_duration, major_distance, coverage_basis, covered_components[]",
            "event_label": "Extracting: Coverage clauses",
        },
        {
            "name": "exclusions",
            "labels": ["exclusion", "legal_disclaimer"],
            "prompt_file": "extract_exclusions.txt",
            "fields": "exclusions[] (clause_no, title, text), towing (covered, cap_amount, conditions)",
            "event_label": "Extracting: Exclusions & limitations",
        },
        {
            "name": "claim_procedure",
            "labels": ["claim_procedure", "eligibility_condition"],
            "prompt_file": "extract_claim_procedure.txt",
            "fields": "claim_procedure, eligibility_conditions[], fuel_def_requirements",
            "event_label": "Extracting: Claim procedure & eligibility",
        },
    ],
    "coverage_code_table": [
        {
            "name": "vehicle_identification",
            "labels": ["vehicle_identification", "issuer_metadata"],
            "prompt_file": "extract_vehicle.txt",
            "fields": "make, model, model_year, vin, chassis_id, marketing_type, unit_number",
            "event_label": "Extracting: Vehicle identification",
        },
        {
            "name": "coverage_codes",
            "labels": ["coverage_code_row", "coverage_clause"],
            "prompt_file": "extract_coverage_codes.txt",
            "fields": "coverage_codes[] (code, description, category, duration, distance, start_date, end_date)",
            "event_label": "Extracting: Coverage codes table",
        },
    ],
    "repair_invoice": [
        {
            "name": "vehicle_and_header",
            "labels": ["vehicle_identification", "issuer_metadata"],
            "prompt_file": "extract_vehicle.txt",
            "fields": "make, model, model_year, vin, unit_number, meter_reading, in_service_date, invoice_no, ro_no, invoice_date, customer",
            "event_label": "Extracting: Vehicle & invoice header",
        },
        {
            "name": "line_items",
            "labels": ["invoice_line_item"],
            "prompt_file": "extract_invoice.txt",
            "fields": "complaint, correction, line_items[] (part_no, description, quantity, unit, unit_price, extended_price), totals (parts_total, labor_total, core_charge, tax_total, grand_total)",
            "event_label": "Extracting: Invoice line items & totals",
        },
    ],
    "generic_document": [
        {
            "name": "full_document",
            "labels": ["vehicle_identification", "coverage_clause", "issuer_metadata", "other"],
            "prompt_file": "extract_generic.txt",
            "fields": "document (title, issuer, date), vehicle (make, model, vin), extensions[]",
            "event_label": "Extracting: Document contents",
        }
    ],
}


def _collect_section_text(
    sections: list[dict],
    target_labels: list[str],
    md_content: str,
    plain_text: str,
) -> str:
    """
    Gather text for sections whose section_label is in target_labels.
    Falls back to full document text if no labeled sections match.
    """
    matching_previews = [
        s.get("text_preview", "")
        for s in sections
        if s.get("section_label") in target_labels or s.get("label") in target_labels
    ]
    if matching_previews:
        section_text = "\n\n".join(p for p in matching_previews if p)
        # Also include the markdown slice for tables (coverage code tables need it)
        if "coverage_code_row" in target_labels or "invoice_line_item" in target_labels:
            # Prefer md_content for table-heavy sections
            return _clean_text(md_content)[:settings.schema_max_text_chars]
        return section_text[:settings.schema_max_text_chars]
    # No labeled sections found — use full document text
    return _clean_text(md_content or plain_text)[:settings.schema_max_text_chars]


def _run_section_extraction(
    section_config: dict,
    document_type: str,
    sections: list[dict],
    md_content: str,
    plain_text: str,
    llm: LlmService,
) -> dict:
    """Run one LLM extraction call for a section group. Returns field dict."""
    prompt_path = _PROMPT_DIR / section_config["prompt_file"]
    if not prompt_path.exists():
        # Fallback: use generic extraction prompt with field hints
        prompt_path = _PROMPT_DIR / "schema_extraction.txt"

    prompt_template = prompt_path.read_text(encoding="utf-8")
    section_text = _collect_section_text(
        sections,
        section_config["labels"],
        md_content,
        plain_text,
    )

    full_prompt = (
        f"{prompt_template}\n\n"
        f"DOCUMENT_TYPE: {document_type}\n"
        f"EXTRACTION_TARGET:\n{section_config['fields']}\n\n"
        f"<SECTION_TEXT>\n{section_text}\n</SECTION_TEXT>"
    )

    raw = llm.small_model_call(
        prompt=full_prompt,
        system_message="Extract fields from this document section. Return JSON only.",
    )
    try:
        return _parse_json(raw)
    except (json.JSONDecodeError, ValueError):
        logger.warning("Section extraction JSON parse failed for %s", section_config["name"])
        return {}


def _merge_section_extracts(section_name: str, extracted: dict, master: dict) -> dict:
    """
    Merge section extract into the master schema dict.
    Strategy: for each key in extracted, if it's a list, extend master's list;
    if it's a dict with 'value' key (field wrapper), prefer extracted if not missing.
    """
    for key, val in extracted.items():
        if key in ("document", "vehicle", "profiles"):
            # nested — recurse one level
            master.setdefault(key, {})
            _merge_section_extracts(key, val, master[key])
        elif isinstance(val, list) and key in master and isinstance(master[key], list):
            # Extend array fields (coverage_codes, exclusions, etc.)
            master[key].extend(val)
        elif isinstance(val, dict) and "value" in val:
            # Field wrapper — only overwrite if extracted has a real value
            existing = master.get(key, {})
            if not isinstance(existing, dict) or existing.get("status") == "missing":
                master[key] = val
        else:
            master.setdefault(key, val)
    return master


def extract_master_schema(
    document_id: str,
    document_type: str,
    md_content: str,
    plain_text: str,
    page_count: int | None,
    tables_text: str = "",
    sections: list[dict] | None = None,
) -> dict:
    """
    Run per-section extraction pipeline, merge into master schema, write to DB.
    Each section group emits its own pipeline event via the orchestrator's event step.
    Returns the merged master_schema dict.
    """
    if not settings.enable_schema_pipeline:
        return _empty_schema(document_type)

    llm = LlmService()
    sections = sections or []

    # Use combined text (tables_text first for table-heavy docs)
    effective_md = tables_text.strip() + "\n\n" + (md_content or "") if tables_text.strip() else (md_content or "")
    effective_md = _clean_text(effective_md)

    extraction_groups = SECTION_EXTRACTION_MAP.get(
        document_type, SECTION_EXTRACTION_MAP["generic_document"]
    )

    section_extracts = []
    master: dict = {
        "document": {},
        "vehicle": {},
        "profiles": {document_type: {}},
        "extensions": [],
    }

    for group in extraction_groups:
        logger.info("[%s] Extracting section group: %s", document_id, group["name"])
        extracted = _run_section_extraction(
            group, document_type, sections, effective_md, plain_text, llm
        )

        # Store intermediate extract
        section_extracts.append({
            "name": group["name"],
            "labels": group["labels"],
            "extracted": extracted,
        })

        # Merge into master
        if group["name"] in ("vehicle_identification", "vehicle_and_header"):
            # Vehicle fields go into master.vehicle
            vehicle_fields = extracted.get("vehicle", extracted)
            _merge_section_extracts("vehicle", vehicle_fields, master["vehicle"])
            # Also pick up document-level fields
            doc_fields = extracted.get("document", {})
            _merge_section_extracts("document", doc_fields, master["document"])
            # Invoice header fields
            for inv_key in ("invoice_no", "ro_no", "invoice_date", "customer", "complaint", "correction"):
                if inv_key in extracted:
                    master["profiles"][document_type].setdefault(inv_key, extracted[inv_key])

        elif group["name"] in ("coverage_summary", "coverage_codes", "line_items", "exclusions", "claim_procedure"):
            profile = master["profiles"].setdefault(document_type, {})
            _merge_section_extracts(group["name"], extracted, profile)

        elif group["name"] == "full_document":
            _merge_section_extracts("document", extracted.get("document", {}), master["document"])
            _merge_section_extracts("vehicle", extracted.get("vehicle", {}), master["vehicle"])
            for ext in extracted.get("extensions", []):
                master["extensions"].append(ext)

    # Normalize make/model/VIN
    master = _normalize(master)

    # Quality
    quality = _compute_quality(master, page_count)
    master["quality"] = quality

    # Extract top-level vehicle values for DB columns
    vehicle = master.get("vehicle", {}) or {}
    make_val = _fw_value(vehicle.get("make"))
    model_val = _fw_value(vehicle.get("model"))
    year_val = _fw_value(vehicle.get("model_year"))
    vin_val = _fw_value(vehicle.get("vin"))
    chassis_val = _fw_value(vehicle.get("chassis_id"))

    # Required fields check
    required_missing = not all([vin_val or chassis_val, make_val, model_val])

    with SessionLocal() as session:
        session.execute(
            text("""
                UPDATE documents
                SET master_schema_json       = CAST(:schema AS jsonb),
                    section_extracts_json    = CAST(:extracts AS jsonb),
                    completeness             = :comp,
                    required_fields_missing  = :req_missing,
                    make                     = COALESCE(:make, make),
                    model                    = COALESCE(:model, model),
                    year                     = COALESCE(:year, year),
                    metadata_json            = COALESCE(metadata_json, '{{}}'::jsonb)
                                               || CAST(:meta AS jsonb),
                    updated_at               = NOW()
                WHERE id = :id
            """),
            {
                "schema": json.dumps(master),
                "extracts": json.dumps(section_extracts),
                "comp": quality["overall_completeness"],
                "req_missing": required_missing,
                "make": make_val,
                "model": model_val,
                "year": year_val,
                "meta": json.dumps({k: v for k, v in {
                    "vin": vin_val, "chassis_id": chassis_val
                }.items() if v}),
                "id": document_id,
            },
        )
        session.commit()

    logger.info(
        "[%s] Schema extracted completeness=%.2f required_missing=%s groups=%d",
        document_id, quality["overall_completeness"], required_missing, len(section_extracts)
    )
    return master


def _normalize(schema: dict) -> dict:
    vehicle = schema.get("vehicle", {})
    if isinstance(vehicle, dict):
        raw_make = _fw_value(vehicle.get("make")) or ""
        if raw_make.lower() in ("volvo", "volvo truck", "volvo trucks"):
            if isinstance(vehicle.get("make"), dict):
                vehicle["make"]["value"] = "Volvo Truck"
        raw_model = _fw_value(vehicle.get("model")) or ""
        if raw_model and isinstance(vehicle.get("model"), dict):
            vehicle["model"]["value"] = re.sub(r"\s+N$", "", raw_model).strip()
        # VIN regex validation
        raw_vin = _fw_value(vehicle.get("vin")) or ""
        if raw_vin and not re.match(r"^[A-HJ-NPR-Z0-9]{17}$", raw_vin, re.IGNORECASE):
            if isinstance(vehicle.get("vin"), dict):
                vehicle["vin"]["status"] = "low_confidence"
    return schema


def _compute_quality(schema: dict, page_count: int | None) -> dict:
    extracted = missing = low_conf = 0
    def _walk(obj):
        nonlocal extracted, missing, low_conf
        if isinstance(obj, dict):
            if "status" in obj and "value" in obj:
                st = obj["status"]
                if st == "extracted": extracted += 1
                elif st == "missing": missing += 1
                elif st == "low_confidence": low_conf += 1; extracted += 1
            else:
                for v in obj.values(): _walk(v)
        elif isinstance(obj, list):
            for item in obj: _walk(item)
    _walk(schema)
    total = extracted + missing
    return {
        "overall_completeness": round(extracted / total, 3) if total > 0 else 0.0,
        "fields_extracted": extracted, "fields_missing": missing,
        "fields_low_confidence": low_conf, "extraction_warnings": [],
    }


def _empty_schema(document_type: str) -> dict:
    return {
        "document": {"document_type": {"value": document_type, "status": "extracted", "confidence": 0.5, "page": None}},
        "vehicle": {}, "profiles": {document_type: {}}, "extensions": [], "quality": {
            "overall_completeness": 0.0, "fields_extracted": 0, "fields_missing": 1,
            "fields_low_confidence": 0, "extraction_warnings": ["schema pipeline disabled"],
        },
    }
