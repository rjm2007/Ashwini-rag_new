"""Session-scoped eligibility slot filling."""

from __future__ import annotations

from datetime import datetime


def fields_needed_for_row(row: dict) -> list[str]:
    period = row.get("coverage_period") or {}
    needed: list[str] = []
    if period.get("duration_months") is not None:
        needed.append("purchase_date")
    if period.get("mileage_limit") is not None:
        needed.append("current_mileage")
    return needed


def missing_eligibility_fields(row: dict, eligibility: dict | None) -> list[str]:
    eligibility = eligibility or {}
    missing: list[str] = []
    for field in fields_needed_for_row(row):
        if not eligibility.get(field):
            missing.append(field)
    return missing


def build_eligibility_prompt(missing: list[str], row: dict) -> str:
    cid = row.get("coverage_id") or "coverage"
    name = row.get("coverage_name") or cid
    parts = [f"To evaluate {name} ({cid}), I need:"]
    if "purchase_date" in missing:
        parts.append("in-service or purchase date")
    if "current_mileage" in missing:
        parts.append("current odometer reading")
    return " ".join(parts)


def parse_purchase_date(value: str) -> datetime | None:
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(value.strip(), fmt)
        except ValueError:
            continue
    return None


def months_since_purchase(purchase_date: str) -> int | None:
    dt = parse_purchase_date(purchase_date)
    if not dt:
        return None
    delta = datetime.utcnow() - dt
    return int(delta.days / 30.44)
