"""
metadata_extractor.py — Extracts structured warranty metadata from OCR text using OpenAI.

Extracts: make, model, year, warranty_type, country, VIN, chassis_id, coverage_summary.
Uses the small/cheap model (gpt-4o-mini by default).
"""

import json
import logging

from openai import OpenAI

from openai_compat import chat_create_kwargs

from config import RagConfig

logger = logging.getLogger("metadata_extractor")

EXTRACTION_PROMPT = """Read the following warranty document text and extract metadata as JSON.
Return ONLY a JSON object with these keys (use null if not found):
{{
  "make": "manufacturer brand e.g. Volvo, Freightliner",
  "model": "model name e.g. VNL64T, Cascadia",
  "year": 2020,
  "warranty_type": "e.g. Standard Engine Warranty, Vehicle Coverage, Repair Invoice",
  "country": "e.g. USA, Canada",
  "vin": "VIN number if present, null otherwise",
  "chassis_id": "chassis/unit number if present, null otherwise",
  "coverage_summary": "one sentence summary of what this document covers"
}}

Document text (first 3000 chars):
---
{text}
---

Return the JSON object only. No markdown fences, no explanation."""


def extract_metadata(cfg: RagConfig, text: str) -> dict:
    """
    Extract warranty metadata from document text.

    Returns a dict with keys: make, model, year, warranty_type, country,
    vin, chassis_id, coverage_summary. Missing values are None.
    """
    client = OpenAI(api_key=cfg.openai_api_key)

    try:
        resp = client.chat.completions.create(
            model=cfg.small_model,
            messages=[
                {"role": "system", "content": "Extract warranty document metadata as JSON only."},
                {"role": "user", "content": EXTRACTION_PROMPT.format(text=text[:3000])},
            ],
            **chat_create_kwargs(cfg.small_model, 300),
        )
        raw = (resp.choices[0].message.content or "{}").strip()
        # Strip markdown code fences if the model adds them
        raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        metadata = json.loads(raw)
        logger.info(
            "Extracted metadata: make=%s model=%s year=%s type=%s",
            metadata.get("make"), metadata.get("model"),
            metadata.get("year"), metadata.get("warranty_type"),
        )
        return metadata

    except json.JSONDecodeError as e:
        logger.warning("Metadata JSON parse failed: %s (raw: %s)", e, raw[:200])
        return {}
    except Exception as e:
        logger.warning("Metadata extraction failed: %s", e)
        return {}
