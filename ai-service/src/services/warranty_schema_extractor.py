"""Two-pass WARR-1172 warranty schema extractor (provider-agnostic)."""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path

from .llm_service import LlmService
from .warranty_normalizer import normalize_warranty_schema
from .warranty_table_bridge import should_use_table_bridge, table_rows_to_coverage_components

logger = logging.getLogger("warranty_extractor")

_PROMPT_DIR = Path(__file__).resolve().parent.parent / "prompts"
_DURATION_HINT_RE = re.compile(
    r"\b(\d+\s*(?:month|months|mo|year|years|day|days)|\d[\d,]*\s*(?:mile|miles|km))\b",
    re.IGNORECASE,
)
_CODE_HINT_RE = re.compile(r"\b[A-Z]\d{3,4}\b")


def _parse_json(raw: str) -> dict:
    s = (raw or "").strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s)
        s = re.sub(r"\s*```$", "", s)
    return json.loads(s.strip())


def _load_prompt(name: str) -> str:
    return (_PROMPT_DIR / name).read_text(encoding="utf-8")


def _coverage_region_text(
    md_content: str,
    plain_text: str,
    tables_text: str,
    profile_hint: str = "",
) -> str:
    parts = []
    if tables_text.strip():
        parts.append(tables_text.strip())
    if md_content.strip():
        parts.append(md_content.strip())
    if plain_text.strip():
        parts.append(plain_text.strip())
    combined = "\n\n".join(parts)
    if profile_hint:
        combined = f"Coverage region hint: {profile_hint}\n\n{combined}"
    return combined[:120000]


def _estimate_row_count(text: str) -> int:
    lines = [ln for ln in text.splitlines() if ln.strip()]
    coded = sum(1 for ln in lines if _CODE_HINT_RE.search(ln) and _DURATION_HINT_RE.search(ln))
    if coded >= 3:
        return coded
    return sum(1 for ln in lines if _DURATION_HINT_RE.search(ln))


def extract_profile(
    document_id: str,
    md_content: str,
    plain_text: str,
    filename: str = "",
    llm: LlmService | None = None,
) -> dict:
    """Pass 1: document profile + applicability (LLM)."""
    llm = llm or LlmService()
    header_text = "\n\n".join(
        part for part in [(plain_text or "")[:8000], (md_content or "")[:4000]] if part
    )
    profile_prompt = _load_prompt("extract_profile.txt")
    profile_raw = llm.small_model_call(
        f"Document text (first pages):\n{header_text}\n\nFilename: {filename}",
        profile_prompt,
        stage="schema_profile",
        document_id=document_id,
    )
    profile = _parse_json(profile_raw)
    return profile


def extract_coverage_components(
    document_id: str,
    md_content: str,
    plain_text: str,
    tables_text: str = "",
    structured_tables: list[dict] | None = None,
    region_hint: str = "",
    llm: LlmService | None = None,
) -> dict:
    """Pass 2: coverage rows via table bridge or LLM."""
    if should_use_table_bridge(structured_tables, tables_text):
        rows = table_rows_to_coverage_components(structured_tables, tables_text)
        return {
            "coverage_components": rows,
            "general_conditions": [],
            "general_exclusions": [],
            "source": "table_bridge",
        }

    llm = llm or LlmService()
    region_text = _coverage_region_text(md_content, plain_text, tables_text, region_hint)
    coverage_prompt = _load_prompt("extract_coverage.txt")
    coverage_raw = llm.small_model_call(
        f"Extract all coverage rows from this document region:\n\n{region_text}",
        coverage_prompt,
        stage="schema_coverage",
        document_id=document_id,
    )
    payload = _parse_json(coverage_raw)
    payload["source"] = "llm"
    return payload


def extract_warranty_schema(
    document_id: str,
    md_content: str,
    plain_text: str,
    tables_text: str = "",
    page_count: int | None = None,
    structured_sections: list[dict] | None = None,
    structured_tables: list[dict] | None = None,
    filename: str = "",
    existing_vehicle: dict | None = None,
    llm: LlmService | None = None,
) -> dict:
    """Return one WARR-1172-shaped dict."""
    llm = llm or LlmService()
    header_text = "\n\n".join(
        part for part in [(plain_text or "")[:8000], (md_content or "")[:4000]] if part
    )
    profile_prompt = _load_prompt("extract_profile.txt")
    profile_raw = llm.small_model_call(
        f"Document text (first pages):\n{header_text}\n\nFilename: {filename}",
        profile_prompt,
        stage="schema_profile",
        document_id=document_id,
    )
    profile_payload = _parse_json(profile_raw)
    region_hint = profile_payload.pop("coverage_region_hint", "") or ""

    coverage_payload = extract_coverage_components(
        document_id,
        md_content=md_content,
        plain_text=plain_text,
        tables_text=tables_text,
        structured_tables=structured_tables,
        region_hint=region_hint,
        llm=llm,
    )

    schema: dict = {
        "document": profile_payload.get("document") or {},
        "warranty_program": profile_payload.get("warranty_program") or {},
        "asset_context": profile_payload.get("asset_context") or {},
        "applicability": profile_payload.get("applicability") or {},
        "coverage_components": coverage_payload.get("coverage_components") or [],
        "general_conditions": coverage_payload.get("general_conditions") or [],
        "general_exclusions": coverage_payload.get("general_exclusions") or [],
        "source_references": [],
        "extraction_notes": [],
    }
    if coverage_payload.get("source") == "table_bridge":
        schema["extraction_notes"].append("Coverage rows extracted deterministically from Docling tables.")

    region_text = _coverage_region_text(md_content, plain_text, tables_text, region_hint)
    expected = _estimate_row_count(region_text)
    actual = len(schema["coverage_components"])
    if expected > 0 and actual < max(1, int(expected * 0.6)):
        schema["extraction_notes"].append(
            f"Row count check: extracted {actual} rows vs ~{expected} table/duration hints — review recommended."
        )
        logger.warning(
            "[%s] coverage anti-omission: extracted=%d expected~=%d",
            document_id,
            actual,
            expected,
        )

    schema = normalize_warranty_schema(
        schema,
        filename=filename,
        existing_vehicle=existing_vehicle,
    )
    return schema
