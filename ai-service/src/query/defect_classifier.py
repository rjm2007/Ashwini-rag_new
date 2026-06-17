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
