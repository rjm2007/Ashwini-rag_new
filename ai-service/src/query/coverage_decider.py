"""Numeric time/mileage coverage verdict."""

from __future__ import annotations

from .eligibility_engine import months_since_purchase


def decide_coverage(row: dict, eligibility: dict | None) -> dict:
    eligibility = eligibility or {}
    period = row.get("coverage_period") or {}
    duration_months = period.get("duration_months")
    mileage_limit = period.get("mileage_limit")
    mileage_unit = period.get("mileage_unit")

    time_ok: bool | None = None
    mileage_ok: bool | None = None
    reasons: list[str] = []

    if duration_months is not None:
        age = months_since_purchase(str(eligibility.get("purchase_date") or ""))
        if age is None:
            return {
                "decision": "needs_eligibility",
                "time_ok": None,
                "mileage_ok": None,
                "reasons": ["purchase_date required"],
            }
        time_ok = age <= int(duration_months)
        reasons.append(
            f"Age {age} months vs limit {duration_months} months"
            + (" — within limit" if time_ok else " — exceeded")
        )

    if mileage_limit is not None:
        current = eligibility.get("current_mileage")
        if current is None:
            return {
                "decision": "needs_eligibility",
                "time_ok": time_ok,
                "mileage_ok": None,
                "reasons": reasons + ["current_mileage required"],
            }
        try:
            current_mi = float(current)
        except (TypeError, ValueError):
            return {
                "decision": "needs_eligibility",
                "time_ok": time_ok,
                "mileage_ok": None,
                "reasons": reasons + ["invalid mileage"],
            }
        mileage_ok = current_mi <= float(mileage_limit)
        unit = mileage_unit or "miles"
        reasons.append(
            f"Mileage {int(current_mi)} vs limit {mileage_limit} {unit}"
            + (" — within limit" if mileage_ok else " — exceeded")
        )

    if time_ok is None and mileage_ok is None:
        decision = "covered"
        reasons.append("No numeric time or mileage limits on this row")
    elif time_ok is False or mileage_ok is False:
        decision = "not_covered"
    elif time_ok is True or mileage_ok is True:
        if (time_ok is False) or (mileage_ok is False):
            decision = "not_covered"
        elif time_ok is True and mileage_ok is True:
            decision = "covered"
        elif time_ok is True or mileage_ok is True:
            decision = "covered"
        else:
            decision = "covered"
    else:
        decision = "covered" if (time_ok is not False and mileage_ok is not False) else "not_covered"

    if duration_months is not None and mileage_limit is not None:
        decision = "covered" if (time_ok and mileage_ok) else "not_covered"

    return {
        "decision": decision,
        "time_ok": time_ok,
        "mileage_ok": mileage_ok,
        "reasons": reasons,
        "coverage_id": row.get("coverage_id"),
        "coverage_name": row.get("coverage_name"),
    }
