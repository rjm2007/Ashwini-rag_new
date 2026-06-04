"""Extract master_schema_json from document using one small-model LLM call."""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path

from sqlalchemy import text

from ..config import settings
from ..database import SessionLocal
from ..services.llm_service import LlmService

logger = logging.getLogger("schema_extraction")
_PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "schema_extraction.txt"

_PROFILE_FIELD_HINTS: dict[str, str] = {
    "warranty_certificate": """
FIELDS: document (title, issuer, dates), vehicle (make, model, vin, chassis_id),
profiles.warranty_certificate: coverage_summary, covered_components[], exclusions[], towing, claim_procedure
""",
    "coverage_code_table": """
FIELDS: document, vehicle (vin, chassis_id, make),
profiles.coverage_code_table.coverage_codes[]: code, description, category, duration, distance, start_date, end_date
""",
    "repair_invoice": """
FIELDS: document, vehicle, profiles.repair_invoice: invoice_no, line_items[], totals
""",
    "generic_document": "FIELDS: document, vehicle if present, extensions[]",
}


def _parse_llm_json(raw: str) -> dict:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text.strip())


def _fw_value(fw: object):
    if isinstance(fw, dict):
        return fw.get("value")
    return None


def _clean_document_text(text: str) -> str:
    """Drop embedded images so the char budget is used for real text/tables."""
    if not text:
        return ""
    cleaned = re.sub(r"!\[[^\]]*\]\(data:image[^)]+\)", "", text, flags=re.IGNORECASE)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def _build_extraction_text(md_content: str, plain_text: str, tables_text: str) -> str:
    parts: list[str] = []
    if tables_text.strip():
        parts.append(f"<TABLES>\n{tables_text.strip()}\n</TABLES>")
    body = _clean_document_text(md_content) or _clean_document_text(plain_text)
    if body:
        parts.append(f"<DOCUMENT_TEXT>\n{body}\n</DOCUMENT_TEXT>")
    return "\n\n".join(parts)[: settings.schema_max_text_chars]


def extract_master_schema(
    document_id: str,
    document_type: str,
    md_content: str,
    plain_text: str,
    page_count: int | None,
    tables_text: str = "",
) -> dict:
    if not settings.enable_schema_pipeline:
        return _empty_schema(document_type)

    llm = LlmService()
    prompt = _PROMPT_PATH.read_text(encoding="utf-8")
    field_hints = _PROFILE_FIELD_HINTS.get(document_type, _PROFILE_FIELD_HINTS["generic_document"])
    doc_text = _build_extraction_text(md_content, plain_text, tables_text)
    full_prompt = (
        f"{prompt}\n\nDOCUMENT_TYPE: {document_type}\n\n"
        f"EXTRACTION_TARGET:\n{field_hints}\n\n"
        f"{doc_text}"
    )
    raw = llm.small_model_call(
        prompt=full_prompt,
        system_message="Extract document fields as JSON. Follow the schema exactly.",
    )
    try:
        master_schema = _parse_llm_json(raw)
    except (json.JSONDecodeError, ValueError):
        logger.warning("[%s] Schema extraction JSON parse failed", document_id)
        master_schema = _empty_schema(document_type)

    master_schema = _normalize(master_schema)
    quality = _compute_quality(master_schema, page_count)
    master_schema["quality"] = quality

    vehicle = master_schema.get("vehicle", {}) or {}
    meta_patch = {
        "vin": _fw_value(vehicle.get("vin")),
        "chassis_id": _fw_value(vehicle.get("chassis_id")),
    }
    with SessionLocal() as session:
        session.execute(
            text("""
                UPDATE documents
                SET master_schema_json = CAST(:schema AS jsonb),
                    completeness = :comp,
                    make = COALESCE(:make, make),
                    model = COALESCE(:model, model),
                    year = COALESCE(:year, year),
                    metadata_json = COALESCE(metadata_json, '{}'::jsonb) || CAST(:meta AS jsonb),
                    updated_at = NOW()
                WHERE id = :id
            """),
            {
                "schema": json.dumps(master_schema),
                "comp": quality["overall_completeness"],
                "make": _fw_value(vehicle.get("make")),
                "model": _fw_value(vehicle.get("model")),
                "year": _fw_value(vehicle.get("model_year")),
                "meta": json.dumps({k: v for k, v in meta_patch.items() if v}),
                "id": document_id,
            },
        )
        session.commit()

    logger.info(
        "[%s] Schema extracted completeness=%.2f",
        document_id,
        quality["overall_completeness"],
    )
    return master_schema


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
    return schema


def _compute_quality(schema: dict, page_count: int | None) -> dict:
    extracted = missing = low_conf = 0

    def _walk(obj):
        nonlocal extracted, missing, low_conf
        if isinstance(obj, dict):
            if "status" in obj and "value" in obj:
                st = obj["status"]
                if st == "extracted":
                    extracted += 1
                elif st == "missing":
                    missing += 1
                elif st == "low_confidence":
                    low_conf += 1
                    extracted += 1
            else:
                for v in obj.values():
                    _walk(v)
        elif isinstance(obj, list):
            for item in obj:
                _walk(item)

    _walk(schema)
    total = extracted + missing
    completeness = round(extracted / total, 3) if total > 0 else 0.0
    return {
        "overall_completeness": completeness,
        "fields_extracted": extracted,
        "fields_missing": missing,
        "fields_low_confidence": low_conf,
        "tables_detected": 0,
        "extraction_warnings": [],
        "page_count": page_count,
    }


def _empty_schema(document_type: str) -> dict:
    return {
        "document": {
            "document_type": {
                "value": document_type,
                "status": "extracted",
                "confidence": 0.5,
                "page": None,
                "evidence_quote": None,
            }
        },
        "vehicle": {},
        "profiles": {document_type: {}},
        "extensions": [],
        "quality": _compute_quality({}, None),
    }
