"""Numeric time/mileage coverage verdict."""

from __future__ import annotations

from .eligibility_engine import months_since_purchase


def decide_coverage(row: dict, eligibility: dict | None) -> dict:
    eligibility = eligibility or {}
    period = row.get("coverage_period") or {}
    duration_months = period.get("duration_months")
    mileage_limit = period.get("mileage_limit")
    mileage_unit = period.get("mileage_unit")

    checks: list[dict] = []
    time_ok: bool | None = None
    mileage_ok: bool | None = None
    reasons: list[str] = []

    if duration_months is not None and eligibility.get("purchase_date"):
        age = months_since_purchase(str(eligibility.get("purchase_date")))
        if age is not None:
            time_ok = age <= int(duration_months)
            detail = f"{age} mo elapsed vs {duration_months} mo limit"
            checks.append({"type": "time", "passed": time_ok, "detail": detail})
            reasons.append(detail + (" — within limit" if time_ok else " — exceeded"))

    if mileage_limit is not None and eligibility.get("current_mileage") is not None:
        try:
            current_mi = float(eligibility.get("current_mileage"))
            mileage_ok = current_mi <= float(mileage_limit)
            unit = mileage_unit or "miles"
            detail = f"{int(current_mi):,} {unit} vs {int(mileage_limit):,} {unit} limit"
            checks.append({"type": "mileage", "passed": mileage_ok, "detail": detail})
            reasons.append(detail + (" — within limit" if mileage_ok else " — exceeded"))
        except (TypeError, ValueError):
            pass

    flags = [c["passed"] for c in checks if c.get("passed") is not None]
    if not flags:
        decision = "insufficient_evidence"
        if duration_months is None and mileage_limit is None:
            decision = "covered"
            reasons.append("No numeric time or mileage limits on this row")
    elif all(flags):
        decision = "covered"
    elif time_ok is False or mileage_ok is False:
        decision = "not_covered"
    elif any(flags):
        decision = "partial"
    else:
        decision = "not_covered"

    if duration_months is not None and mileage_limit is not None and flags:
        decision = "covered" if all(flags) else "not_covered"

    return {
        "decision": decision,
        "time_ok": time_ok,
        "mileage_ok": mileage_ok,
        "duration_months": duration_months,
        "mileage_limit": mileage_limit,
        "mileage_unit": mileage_unit,
        "checks": checks,
        "reasons": reasons,
        "coverage_id": row.get("coverage_id"),
        "coverage_name": row.get("coverage_name"),
    }


def plain_language_explanation(verdict: dict, row: dict) -> str:
    decision = verdict.get("decision")
    name = row.get("coverage_name") or row.get("coverage_id") or "coverage"
    cid = row.get("coverage_id") or ""
    dm = verdict.get("duration_months")
    ml = verdict.get("mileage_limit")
    unit = verdict.get("mileage_unit") or "miles"

    if decision == "covered":
        return (
            f"Yes — {name} ({cid}) covers this. "
            f"Limits are {dm or 'no time'} months and {f'{ml:,} {unit}' if ml else 'no mileage cap'}; "
            f"your vehicle is within the stated limits."
        )
    if decision == "not_covered":
        failed = [c["detail"] for c in verdict.get("checks") or [] if c.get("passed") is False]
        return f"Not covered — {name} ({cid}). " + ("; ".join(failed) if failed else "Limits exceeded.")
    if decision == "partial":
        return f"Partially covered — {name} ({cid}) meets some but not all limit checks."
    return (
        f"I matched this to {name} ({cid}) but need your purchase date and/or mileage to confirm coverage."
    )
