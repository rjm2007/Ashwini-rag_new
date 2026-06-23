"""Classify defect free text into hierarchy targets."""

from __future__ import annotations

import json
import re
from pathlib import Path

from ..services.llm_service import LlmService

_PROMPT = (Path(__file__).resolve().parent / "prompts" / "defect_classification.txt").read_text(
    encoding="utf-8"
)


def _parse_json(raw: str) -> dict:
    s = (raw or "").strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s)
        s = re.sub(r"\s*```$", "", s)
    return json.loads(s.strip())


def classify_defect(
    defect_text: str,
    make: str | None = None,
    model: str | None = None,
    year: int | None = None,
    llm: LlmService | None = None,
) -> dict:
    llm = llm or LlmService()
    context = f"Make: {make or 'unknown'}, Model: {model or 'unknown'}, Year: {year or 'unknown'}"
    raw = llm.small_model_call(
        f"Context: {context}\nDefect: {defect_text}",
        _PROMPT,
    )
    return _parse_json(raw)


_INTERP_PROMPT = (Path(__file__).resolve().parent / "prompts" / "defect_interpretation.txt").read_text(
    encoding="utf-8"
)


def interpret_defect(
    reported_defect: str,
    asset: dict | None = None,
    llm: LlmService | None = None,
) -> dict:
    """Interpret a defect into structured warranty-relevant categories (§4.1).

    Returns the defect_interpretation block plus internal flags
    (is_wear_or_consumable, is_accident_or_misuse, candidate_targets).
    """
    llm = llm or LlmService()
    asset = asset or {}
    context = (
        f"Make: {asset.get('make', 'unknown')}, "
        f"Model: {asset.get('model', 'unknown')}, "
        f"Year: {asset.get('model_year', 'unknown')}"
    )
    raw = llm.small_model_call(
        f"Asset: {context}\nReported defect: {reported_defect}",
        _INTERP_PROMPT,
    )
    try:
        result = _parse_json(raw)
    except (json.JSONDecodeError, ValueError):
        result = {
            "interpreted_component": reported_defect,
            "interpreted_failure_type": "Unknown",
            "defect_category": "Unknown",
            "is_wear_or_consumable": False,
            "is_accident_or_misuse": False,
            "candidate_targets": [{"system": "Unknown", "subsystem": "Unknown",
                                   "component_group": "Unknown", "confidence": 0.3}],
        }
    # Ensure required fields exist with defaults
    result.setdefault("interpreted_component", reported_defect)
    result.setdefault("interpreted_failure_type", "Unknown")
    result.setdefault("defect_category", "Unknown")
    result.setdefault("is_wear_or_consumable", False)
    result.setdefault("is_accident_or_misuse", False)
    result.setdefault("candidate_targets", [])
    return result


