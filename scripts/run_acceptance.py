#!/usr/bin/env python3
"""Run Planning/test.md acceptance checks against ingested documents."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import httpx

BASE = "http://localhost:3001"
AI = "http://localhost:8000"
GOLDEN = Path(__file__).resolve().parents[2] / "Planning" / "Schema.json"

REQUIRED_TOP_KEYS = {
    "document",
    "warranty_program",
    "applicability",
    "coverage_components",
    "general_conditions",
    "general_exclusions",
    "source_references",
    "rag_metadata",
}

VOLVO_SPOT = {
    "D0001": {"duration_months": 12, "mileage_limit": 100000},
    "ET460": {"duration_months": 48, "mileage_limit": 500000},
    "E6460": {"duration_months": 48, "mileage_limit": 500000},
    "U065": {"duration_months": 60, "mileage_limit": 750000},
    "Z0421": {"coverage_type": "Information Only"},
}


def login() -> str:
    r = httpx.post(f"{BASE}/auth/login", json={"email": "admin@demo.com", "password": "admin123"})
    r.raise_for_status()
    return r.json()["token"]


def fetch_documents(token: str) -> list[dict]:
    r = httpx.get(f"{BASE}/documents", headers={"Authorization": f"Bearer {token}"})
    r.raise_for_status()
    payload = r.json()
    if isinstance(payload, list):
        return payload
    return payload.get("data") or []


def validate_structure(schema: dict) -> list[str]:
    errors: list[str] = []
    missing = REQUIRED_TOP_KEYS - set(schema.keys())
    if missing:
        errors.append(f"missing top-level keys: {sorted(missing)}")
    rows = schema.get("coverage_components") or []
    if not rows:
        errors.append("coverage_components empty")
    for row in rows:
        if "status" in row or "evidence_quote" in row:
            errors.append(f"FIELD_WRAPPER in row {row.get('coverage_id')}")
        if row.get("confidence_score") is None:
            errors.append(f"missing confidence_score on {row.get('coverage_id')}")
    return errors


def validate_volvo(schema: dict) -> list[str]:
    errors: list[str] = []
    rows = schema.get("coverage_components") or []
    if not (25 <= len(rows) <= 27):
        errors.append(f"coverage_count={len(rows)} expected ~26")
    app = schema.get("applicability") or {}
    if "volvo" not in (app.get("make") or "").lower():
        errors.append(f"make={app.get('make')}")
    asset = schema.get("asset_context") or {}
    if asset.get("vin") and asset.get("vin") != "4V4NC9EH1LN218380":
        errors.append(f"vin={asset.get('vin')}")
    by_id = {r["coverage_id"]: r for r in rows}
    for cid, expect in VOLVO_SPOT.items():
        if cid not in by_id:
            errors.append(f"missing {cid}")
            continue
        row = by_id[cid]
        period = row.get("coverage_period") or {}
        for k, v in expect.items():
            if k == "coverage_type":
                if row.get(k) != v:
                    errors.append(f"{cid}.{k}={row.get(k)} expected {v}")
            elif period.get(k) != v:
                errors.append(f"{cid}.{k}={period.get(k)} expected {v}")
    e6460 = by_id.get("E6460", {})
    hier = e6460.get("coverage_hierarchy") or {}
    if hier.get("system") != "Powertrain" or hier.get("subsystem") != "Engine":
        errors.append("E6460 hierarchy wrong")
    return errors


def main() -> int:
    token = login()
    docs = fetch_documents(token)
    complete = [d for d in docs if d.get("processingStatus") == "processing_complete"]
    report = {"documents_checked": len(complete), "results": []}
    for doc in complete:
        doc_id = doc.get("id")
        if doc_id:
            detail = httpx.get(
                f"{BASE}/documents/{doc_id}",
                headers={"Authorization": f"Bearer {token}"},
            ).json()
            doc = detail
        schema = doc.get("masterSchemaJson") or doc.get("master_schema_json") or {}
        name = doc.get("originalFilename") or doc.get("filename") or doc.get("id")
        entry = {"filename": name, "documentId": doc.get("id"), "errors": []}
        entry["errors"].extend(validate_structure(schema))
        if "1172" in str(name).lower() or "volvo" in str(name).lower():
            entry["errors"].extend(validate_volvo(schema))
        entry["coverage_count"] = len(schema.get("coverage_components") or [])
        report["results"].append(entry)

    out = Path(__file__).resolve().parent.parent / "eval" / "acceptance_schema_report.json"
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    failed = sum(1 for r in report["results"] if r["errors"])
    print(json.dumps(report, indent=2))
    print(f"\n{len(report['results']) - failed}/{len(report['results'])} docs passed schema checks")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
