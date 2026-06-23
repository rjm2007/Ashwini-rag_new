from datetime import date
from dateutil.relativedelta import relativedelta

def _to_int(v):
    try:
        return int(str(v).replace(",", "").strip())
    except Exception:
        return None

def _parse_date(s):
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return date.fromisoformat(s) if fmt == "%Y-%m-%d" else __import__("datetime").datetime.strptime(s, fmt).date()
        except Exception:
            continue
    return None

def compute_clause_eligibility(row, asset):
    """Eligibility for ONE coverage clause. Each clause has its own limits."""
    p = row.get("coverage_period") or {}
    appl = (asset or {}).get("_applicability") or {}
    dm = p.get("duration_months")
    ml = p.get("mileage_limit")
    pd = (asset or {}).get("purchase_date")
    cm = (asset or {}).get("current_mileage")

    # make/model/year match: true when the warranty does not restrict that field
    def _eq_or_unknown(a, b):
        if not a:
            return True
        return str(a).strip().lower() == str(b or "").strip().lower()
    def _in_or_unknown(lst, b):
        if not lst:
            return True
        return any(str(x).strip().lower() == str(b or "").strip().lower() for x in lst)
    years = appl.get("model_years") or {}
    def _year_ok(y):
        yy = _to_int((asset or {}).get("model_year"))
        if not years or yy is None:
            return True
        if years.get("from") and yy < _to_int(years["from"]):
            return False
        if years.get("to") and yy > _to_int(years["to"]):
            return False
        sp = years.get("specific_years") or []
        if sp:
            return yy in [_to_int(x) for x in sp]
        return True

    exp = None
    time_eligible = None
    sd = _parse_date(pd)
    if dm is not None and sd is not None:
        exp = (sd + relativedelta(months=int(dm))).isoformat()
        time_eligible = date.today() <= date.fromisoformat(exp)

    mileage_eligible = None
    cmi = _to_int(cm)
    if ml is not None and cmi is not None:
        mileage_eligible = cmi <= int(ml)

    return {
        "make_match": _eq_or_unknown(appl.get("make"), (asset or {}).get("make")),
        "model_match": _in_or_unknown(appl.get("models"), (asset or {}).get("model")),
        "model_year_match": _year_ok(None),
        "time_eligible": time_eligible,
        "mileage_eligible": mileage_eligible,
        "current_mileage": cmi,
        "warranty_mileage_limit": ml,
        "duration_months": dm,
        "purchase_date": pd,
        "warranty_expiration_date": exp,
    }

def decide_one_clause(elig, context_confidence, strong_exclusion):
    """Decision for ONE clause. Strong exclusion overrides eligibility (client Example 2)."""
    if strong_exclusion:
        return "NOT_COVERED"
    if context_confidence < 0.5:
        return "NOT_COVERED"
    te, me = elig.get("time_eligible"), elig.get("mileage_eligible")
    checks = [v for v in (te, me) if v is not None]
    if not checks:
        return "POSSIBLY_COVERED"     # matched but no date/mileage to confirm
    if all(checks):
        return "COVERED"
    return "POSSIBLY_COVERED"          # one or both limits fail -> manual review / extended warranty
