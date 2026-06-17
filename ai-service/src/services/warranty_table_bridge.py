"""Map Docling table rows (FIELD_WRAPPER) to WARR-1172 coverage_components[]."""

from __future__ import annotations

import logging
import re

from .coverage_table_parser import parse_coverage_codes_from_pipe_text, parse_coverage_codes_from_tables
from .warranty_normalizer import normalize_duration_period

logger = logging.getLogger("warranty_table_bridge")

_HIERARCHY_MAP: dict[str, dict[str, str | None]] = {
    "engine": {
        "system": "Powertrain",
        "subsystem": "Engine",
        "component_group": "Engine",
        "component": None,
    },
    "emissions": {
        "system": "Emission",
        "subsystem": "Aftertreatment",
        "component_group": "Aftertreatment",
        "component": None,
    },
    "transmission": {
        "system": "Powertrain",
        "subsystem": "Transmission",
        "component_group": "Transmission",
        "component": None,
    },
    "driveline": {
        "system": "Powertrain",
        "subsystem": "Driveline",
        "component_group": "Driveline",
        "component": None,
    },
    "hvac": {
        "system": "HVAC",
        "subsystem": "Air Conditioning",
        "component_group": "AC System",
        "component": None,
    },
    "towing": {
        "system": "Chassis",
        "subsystem": "Towing",
        "component_group": "Towing",
        "component": None,
    },
    "structural": {
        "system": "Chassis",
        "subsystem": "Frame",
        "component_group": "Frame & Crossmembers",
        "component": None,
    },
    "cab": {
        "system": "Cab",
        "subsystem": "Cab Structure",
        "component_group": "Cab",
        "component": None,
    },
    "info_only": {
        "system": "Administrative",
        "subsystem": "Information Only",
        "component_group": "Info Only",
        "component": "No Claims",
    },
    "other": {
        "system": "Vehicle",
        "subsystem": "General",
        "component_group": "General",
        "component": None,
    },
}

_COVERAGE_TYPE_MAP: dict[str, str] = {
    "engine": "Engine",
    "emissions": "Emission",
    "transmission": "Transmission",
    "driveline": "Driveline",
    "hvac": "HVAC",
    "towing": "Towing",
    "structural": "Structural",
    "cab": "Cab",
    "info_only": "Information Only",
    "other": "Basic",
}


def _fw_value(field: object) -> object:
    if isinstance(field, dict) and "value" in field:
        if field.get("status") == "missing":
            return None
        return field.get("value")
    return field


def _fw_page(field: object, default: int = 1) -> int:
    if isinstance(field, dict) and field.get("page"):
        return int(field["page"])
    return default


def _short_name(description: str, code: str) -> str:
    text = (description or "").strip()
    if not text:
        return code
    # Drop leading code if duplicated
    text = re.sub(rf"^{re.escape(code)}\s*[-:]?\s*", "", text, flags=re.I)
    # Take text before duration clause
    text = re.split(r"\b\d+\s*(?:months?|mo|years?|days?)\b", text, maxsplit=1, flags=re.I)[0]
    text = text.strip(" -–—:")
    return text[:120] if text else code


def _build_hierarchy(category: str, description: str, code: str) -> dict:
    base = dict(_HIERARCHY_MAP.get(category, _HIERARCHY_MAP["other"]))
    name = _short_name(description, code)
    if base.get("component") is None and name:
        base["component"] = name[:80]
    return base


def _build_period(duration: str, distance: str) -> dict:
    parts = [p for p in (duration, distance) if p]
    duration_text = " / ".join(parts) if parts else ""
    period = {
        "duration_text": duration_text or None,
        "duration_months": None,
        "mileage_limit": None,
        "mileage_unit": None,
        "hours_limit": None,
        "start_basis": None,
    }
    if distance and "unlimited" in distance.lower():
        period["mileage_unit"] = "unlimited"
    return normalize_duration_period(period)


def _merge_parsed_rows(*groups: list[dict]) -> list[dict]:
    """Union parser rows by coverage code; first occurrence wins."""
    by_code: dict[str, dict] = {}
    for group in groups:
        for entry in group:
            code = str(_fw_value(entry.get("code")) or "").upper()
            if code and code not in by_code:
                by_code[code] = entry
    return list(by_code.values())


def table_rows_to_coverage_components(
    structured_tables: list[dict] | None,
    tables_text: str = "",
) -> list[dict]:
    """Parse tables and return WARR-1172 coverage_components rows."""
    from_tables = parse_coverage_codes_from_tables(structured_tables or [])
    from_pipe = parse_coverage_codes_from_pipe_text(tables_text) if tables_text.strip() else []
    parsed = _merge_parsed_rows(from_tables, from_pipe)

    rows: list[dict] = []
    for entry in parsed:
        code = str(_fw_value(entry.get("code")) or "").upper()
        if not code:
            continue
        description = str(_fw_value(entry.get("description")) or "")
        category = str(_fw_value(entry.get("category")) or "other")
        duration = str(_fw_value(entry.get("duration")) or "")
        distance = str(_fw_value(entry.get("distance")) or "")
        page = _fw_page(entry.get("code"), _fw_page(entry.get("description")))

        hierarchy = _build_hierarchy(category, description, code)
        coverage_type = _COVERAGE_TYPE_MAP.get(category, "Basic")
        if code.startswith("Z") or "info only" in description.lower():
            coverage_type = "Information Only"

        period = _build_period(duration, distance)
        name = _short_name(description, code)
        if code.startswith("E") and "plan" in description.lower():
            name = f"Engine Plan {code[1:]} Warranty" if "plan" not in name.lower() else name

        rows.append(
            {
                "coverage_id": code,
                "coverage_name": name,
                "coverage_hierarchy": hierarchy,
                "coverage_type": coverage_type,
                "coverage_period": period,
                "warranty_type": None,
                "source_reference": {
                    "page": page,
                    "text_reference": description[:500] if description else code,
                },
                "confidence_score": 0.95,
            }
        )

    logger.info("warranty_table_bridge: converted %d table rows", len(rows))
    return rows


def should_use_table_bridge(structured_tables: list[dict] | None, tables_text: str = "") -> bool:
    """Use deterministic bridge when enough coded rows are present."""
    from_tables = parse_coverage_codes_from_tables(structured_tables or [])
    from_pipe = parse_coverage_codes_from_pipe_text(tables_text) if tables_text.strip() else []
    return len(_merge_parsed_rows(from_tables, from_pipe)) >= 5
