"""Defect → match → disambiguate → eligibility → decision workflow."""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime
import uuid
from pathlib import Path

from sqlalchemy import text

from .coverage_decider import compute_clause_eligibility, decide_one_clause
from .defect_classifier import classify_defect, interpret_defect, _parse_json, _load_prompt
from .defect_matcher import match_coverage_rows
from .document_resolver import resolve_documents_by_make_model_year
from .retriever import retrieve_chunks
from ..database import SessionLocal
from ..services.llm_service import LlmService

logger = logging.getLogger(__name__)

_LIST_RE = re.compile(
    r"\b(list|show|all)\b.*\b(coverage|coverages|components|warranties)\b", re.IGNORECASE
)
_CODE_RE = re.compile(r"\b([A-Z]\d{3,4})\b")
_DEFECT_RE = re.compile(
    r"\b(broken|leak|noise|failed|failure|defect|issue|problem|hard to|won'?t|doesn'?t|overheat|sluggish)\b",
    re.IGNORECASE,
)

def _collect_rows(docs: list[dict]) -> list[dict]:
    rows: list[dict] = []
    for doc in docs:
        for row in (doc.get("master_schema") or {}).get("coverage_components") or []:
            item = dict(row)
            item["_documentId"] = doc["documentId"]
            rows.append(item)
    return rows

def _period_label(row: dict) -> str | None:
    period = row.get("coverage_period") or {}
    parts: list[str] = []
    if period.get("duration_months") is not None:
        parts.append(f"{period['duration_months']} months")
    elif period.get("duration_text"):
        parts.append(str(period["duration_text"]).split("/")[0].strip())
    if period.get("mileage_unit") == "unlimited":
        parts.append("Unlimited miles")
    elif period.get("mileage_limit") is not None:
        unit = period.get("mileage_unit") or "miles"
        parts.append(f"{int(period['mileage_limit']):,} {unit}")
    return " / ".join(parts) if parts else None

def _eligibility_hint(row: dict) -> str | None:
    period = row.get("coverage_period") or {}
    need: list[str] = []
    if period.get("duration_months") is not None:
        need.append("purchase date")
    if period.get("mileage_limit") is not None:
        need.append("current mileage")
    if not need:
        return "No date or mileage needed."
    return f"To determine active coverage, provide {' and '.join(need)}."

def _load_doc_exclusions(document_id: str | None) -> tuple[list[dict], list[dict]]:
    if not document_id:
        return [], []
    try:
        with SessionLocal() as session:
            row = session.execute(
                text("SELECT master_schema_json FROM documents WHERE id = :id"),
                {"id": document_id},
            ).first()
        if not row or not row[0]:
            return [], []
        schema = row[0] if isinstance(row[0], dict) else json.loads(row[0])
        return (
            list(schema.get("general_exclusions") or [])[:5],
            list(schema.get("general_conditions") or [])[:5],
        )
    except Exception as exc:
        logger.warning("Failed to load exclusions for %s: %s", document_id, exc)
        return [], []

def _document_name(document_id: str | None) -> str | None:
    if not document_id:
        return None
    try:
        with SessionLocal() as session:
            row = session.execute(
                text("SELECT master_schema_json, filename FROM documents WHERE id = :id"),
                {"id": document_id},
            ).first()
        if not row:
            return None
        schema = row[0] if isinstance(row[0], dict) else json.loads(row[0] or "{}")
        filename = row[1]
        return schema.get("warranty_program", {}).get("program_name") or filename
    except Exception as exc:
        logger.warning("Failed to load document name for %s: %s", document_id, exc)
        return None

def handle_list_coverage(context: dict, document_id: str | None) -> dict:
    docs = resolve_documents_by_make_model_year(
        context.get("make"),
        context.get("model"),
        context.get("year"),
        document_id=document_id,
    )
    rows = _collect_rows(docs)
    items = []
    for r in rows:
        items.append(
            {
                "coverage_id": r.get("coverage_id"),
                "coverage_name": r.get("coverage_name"),
                "coverage_type": r.get("coverage_type"),
                "coverage_period": r.get("coverage_period"),
                "period_label": _period_label(r),
                "eligibility_hint": _eligibility_hint(r),
                "limit_of_liability": r.get("limit_of_liability"),
                "documentId": r.get("_documentId"),
            }
        )
    return {
        "responseType": "coverage_list",
        "coverages": items,
        "answer": f"Found {len(rows)} coverage rows across {len(docs)} document(s).",
        "evidence": [],
        "confidence": 0.9,
        "filters": {},
        "context": context,
    }

def handle_coverage_lookup(question: str, context: dict, document_id: str | None) -> dict | None:
    codes = _CODE_RE.findall(question or "")
    if not codes:
        return None
    code = codes[0]
    docs = resolve_documents_by_make_model_year(
        context.get("make"),
        context.get("model"),
        context.get("year"),
        document_id=document_id,
    )
    rows = [r for r in _collect_rows(docs) if str(r.get("coverage_id")).upper() == code.upper()]
    if not rows:
        return {
            "responseType": "answer",
            "answer": f"I could not find coverage code {code} in certified documents for this vehicle.",
            "evidence": [],
            "confidence": 0.4,
            "filters": {},
            "context": context,
        }
    row = rows[0]
    period = row.get("coverage_period") or {}
    answer = (
        f"{row.get('coverage_name')} ({code}): "
        f"{period.get('duration_text') or 'see document for period details'}."
    )
    return {
        "responseType": "answer",
        "answer": answer,
        "coverage": row,
        "evidence": [],
        "confidence": 0.85,
        "filters": {"coverage_id": code},
        "context": context,
    }

def route_specialized_query(
    question: str,
    context: dict | None,
    document_id: str | None,
    conversation_history: list[dict],
    intent: str,
    classification: dict | None = None,
) -> dict | None:
    context = context or {}
    classification = classification or {}

    if context.get("selectedCoverageId"):
        return handle_defect_workflow(question, context, document_id, conversation_history)

    if (question or "").strip().lower().startswith("/defect"):
        defect_q = question.split("/defect", 1)[1].strip() or question
        return handle_defect_workflow(defect_q, context, document_id, conversation_history)

    if intent == "list_coverage" or _LIST_RE.search(question or ""):
        return handle_list_coverage(context, document_id)
    if _CODE_RE.search(question or ""):
        lookup = handle_coverage_lookup(question, context, document_id)
        if lookup:
            return lookup
    if intent == "defect_report":
        return handle_defect_workflow(question, context, document_id, conversation_history)
    if classification.get("confidence", 1.0) < 0.6 and _DEFECT_RE.search(question or ""):
        return handle_defect_workflow(question, context, document_id, conversation_history)
    return None


def _request_id():
    import datetime, random
    return "WRG-" + datetime.date.today().strftime("%Y%m%d") + "-" + str(random.randint(0, 999999)).zfill(6)

def _check_exclusions(interp, doc_exclusions):
    """Score the defect against exclusions. Wear/accident always strong even without an exclusions section."""
    results = []
    strong = False
    if interp.get("is_wear_or_consumable"):
        strong = True
        title = next((e.get("title") for e in (doc_exclusions or []) if "wear" in (e.get("title", "").lower())), "Normal Wear Items")
        page = next((e.get("page") for e in (doc_exclusions or []) if "wear" in (e.get("title", "").lower())), None)
        results.append({"warranty_heading": title, "page_number": page, "exclusion_confidence_score": 0.95,
                        "exclusion_result": "Strong exclusion found",
                        "explanation": "The reported part is a wear/consumable item and is excluded when replacement is due to normal wear."})
    elif interp.get("is_accident_or_misuse"):
        strong = True
        title = next((e.get("title") for e in (doc_exclusions or []) if any(w in (e.get("title", "").lower()) for w in ("accident", "misuse", "collision", "abuse"))), "Accident & Misuse")
        page = next((e.get("page") for e in (doc_exclusions or []) if any(w in (e.get("title", "").lower()) for w in ("accident", "misuse", "collision", "abuse"))), None)
        results.append({"warranty_heading": title, "page_number": page, "exclusion_confidence_score": 0.92,
                        "exclusion_result": "Strong exclusion found",
                        "explanation": "The failure appears to result from accident or misuse, which warranty excludes."})
    else:
        title = (doc_exclusions or [{}])[0].get("title", "General Warranty Exclusions") if doc_exclusions else "General Warranty Exclusions"
        page = (doc_exclusions or [{}])[0].get("page") if doc_exclusions else None
        results.append({"warranty_heading": title, "page_number": page, "exclusion_confidence_score": 0.4,
                        "exclusion_result": "No strong exclusion found",
                        "explanation": "No clear indication of abuse, lack of maintenance, accident damage, or non-OEM modification."})
    return {"exclusions_checked": results, "strong_exclusion": strong}

def _fmt_date(s):
    try:
        import datetime
        return datetime.date.fromisoformat(s).strftime("%B %d, %Y")
    except Exception:
        return s

def _clause_explanation(decision, row, elig, interp_public):
    name = row.get("coverage_name")
    dm = elig.get("duration_months")
    ml = elig.get("warranty_mileage_limit")
    if decision == "INFORMATION_ONLY":
        return f"This issue may relate to {name}. Provide an in-service/purchase date and current mileage for a coverage decision."
    bits = []
    if dm is not None:
        bits.append(f"{dm} months" + (f" (expires {_fmt_date(elig.get('warranty_expiration_date'))})" if elig.get("warranty_expiration_date") else ""))
    else:
        bits.append("no time limit")
    if ml is not None:
        bits.append(f"{int(ml):,} miles")
    else:
        bits.append("no mileage limit")
    limits = "; ".join(bits)
    if decision == "COVERED":
        return f"{name} covers this. Coverage runs {limits}, and the truck is within the limits, so the repair should be covered."
    if decision == "POSSIBLY_COVERED":
        return f"{name} may cover this ({limits}), but the truck is outside the time or mileage limit, so a manual review or extended-warranty check is recommended."
    return f"{name} does not cover this issue."

def _multi_user_message(reported_defect, interp_public, clause_results, excl, info_only):
    lines = []
    if info_only:
        lines.append("**Warranty Status: Information Only**")
        lines.append("Without an in-service/purchase date and current mileage, this is information only and not a coverage decision.")
    else:
        primary = clause_results[0]
        status = {"COVERED": "Covered", "POSSIBLY_COVERED": "Possibly Covered — Manual Review",
                  "NOT_COVERED": "Not Covered", "INFORMATION_ONLY": "Information Only"}.get(primary["decision"], primary["decision"])
        lines.append(f"**Warranty Status: {status}**")
    lines.append(f'Reported defect: "{reported_defect}" → interpreted as **{interp_public.get("interpreted_component")}** ({interp_public.get("defect_category")}).')
    lines.append("")
    lines.append(f"I found {len(clause_results)} possible matching coverage(s):")
    for c in clause_results:
        e = c["asset_eligibility"]
        pct = int(round(c["context_confidence_score"] * 100))
        lines.append(f"- **{c['warranty_heading']}** — {c['decision'].replace('_',' ').title()} ({pct}% match). {c['why_matched']}")
        if not info_only and (e.get("duration_months") is not None or e.get("warranty_mileage_limit") is not None):
            dl = f"{e['duration_months']} mo" if e.get("duration_months") is not None else "no time limit"
            mlx = f"{int(e['warranty_mileage_limit']):,} mi" if e.get("warranty_mileage_limit") is not None else "no mileage limit"
            lines.append(f"  - Limits: {dl} / {mlx}; expiration: {e.get('warranty_expiration_date') or 'n/a'}; current mileage: {e.get('current_mileage') or 'n/a'}")
    ex = (excl.get("exclusions_checked") or [{}])[0]
    if ex.get("exclusion_result"):
        lines.append("")
        lines.append(f"Exclusion check: {ex['exclusion_result']} — {ex.get('explanation','')}")
    return "\n".join(lines)

def _clause_context(reported_defect, row, document_id, llm):
    """Build the plain-language summary + why_matched + confidence for ONE clause."""
    chunks = retrieve_chunks(
        f"{row.get('coverage_name')} {reported_defect}",
        {"documentId": document_id, "coverage_id": row.get("coverage_id")},
        list_mode=False,
    )
    top = (chunks or [{}])[0].get("payload", {}) if chunks else {}
    out = llm.small_model_call(
        __import__("json").dumps({
            "reported_defect": reported_defect,
            "warranty_heading": row.get("coverage_name"),
            "chunk_text": top.get("text") or (row.get("source_reference") or {}).get("text_reference", ""),
        }),
        _load_prompt("context_why_matched.txt"),
        stage="why_matched",
        document_id=document_id,
    )
    j = _parse_json(out)
    conf = j.get("context_confidence_score")
    if conf is None:
        conf = row.get("_match_score") or 0.6
    return {
        "page_number": (row.get("source_reference") or {}).get("page") or top.get("page"),
        "chunk_id": top.get("chunk_id") or f"{document_id}-CHUNK-{str(row.get('coverage_id'))}",
        "matched_context_summary": j.get("matched_context_summary", ""),
        "why_matched": j.get("why_matched", ""),
        "context_confidence_score": round(float(conf), 2),
    }

def handle_defect_workflow(question, context, document_id, conversation_history):
    import json as _json
    llm = LlmService()
    context = context or {}
    eligibility = context.get("eligibility") or {}
    reported_defect = question

    # 1) resolve the document (chat is document-scoped)
    docs = resolve_documents_by_make_model_year(
        context.get("make"), context.get("model"), context.get("year"), document_id=document_id
    )
    if not docs:
        return {"responseType": "answer",
                "answer": "I need a certified warranty document to evaluate this defect.",
                "evidence": [], "confidence": 0.3, "filters": {}, "context": context}

    doc = docs[0]
    schema = doc.get("master_schema") or {}
    all_rows = _collect_rows(docs)
    document_name = (schema.get("document") or {}).get("source_file") or doc.get("filename") or "Warranty Document"

    # 2) build the asset (make/model/year from the document; date/mileage from the chat sidebar)
    asset = {
        "make": (schema.get("asset_context") or {}).get("make") or (schema.get("applicability") or {}).get("make"),
        "model": (schema.get("asset_context") or {}).get("model"),
        "model_year": (schema.get("applicability") or {}).get("model_years", {}).get("from"),
        "vin": (schema.get("asset_context") or {}).get("vin"),
        "purchase_date": eligibility.get("purchase_date"),
        "current_mileage": eligibility.get("current_mileage"),
        "_applicability": schema.get("applicability") or {},
    }

    # 3) interpret the defect (plain-language component + failure type + category)
    interp = interpret_defect(reported_defect, asset, llm)
    interp_public = {
        "reported_defect": reported_defect,
        "interpreted_component": interp.get("interpreted_component"),
        "interpreted_failure_type": interp.get("interpreted_failure_type"),
        "defect_category": interp.get("defect_category"),
    }

    # 4) match the top clauses (matcher already caps at 3 and requires system+subsystem)
    matched_rows = match_coverage_rows(all_rows, interp.get("candidate_targets") or [])

    # 5) defect-level exclusion check (wear / accident / misuse). Shared across clauses.
    doc_excl, _ = _load_doc_exclusions(document_id)
    excl = _check_exclusions(interp, doc_excl)
    strong_exclusion = excl.get("strong_exclusion") is True

    # 6) INFORMATION ONLY: warranty has limits but no date AND no mileage
    has_limited = any(((r.get("coverage_period") or {}).get("duration_months") is not None or
                       (r.get("coverage_period") or {}).get("mileage_limit") is not None) for r in matched_rows)
    no_inputs = not eligibility.get("purchase_date") and not eligibility.get("current_mileage")

    # 7) no clause matched at all
    if not matched_rows:
        return {"responseType": "answer",
                "answer": ("I could not match this defect to a covered component in this warranty. "
                           "Try describing the component or system (for example: engine, transmission, brakes, cab)."),
                "defect_interpretation": interp_public,
                "evidence": [], "confidence": 0.35, "filters": {}, "context": context}

    # 8) build ONE result per matched clause (answer ALL of them)
    clause_results = []
    for rank, row in enumerate(matched_rows, start=1):
        cx = _clause_context(reported_defect, row, document_id, llm)
        if has_limited and no_inputs:
            elig = compute_clause_eligibility(row, asset)   # most fields null
            decision = "INFORMATION_ONLY"
        else:
            elig = compute_clause_eligibility(row, asset)
            decision = decide_one_clause(elig, cx["context_confidence_score"], strong_exclusion)
        clause_results.append({
            "rank": rank,
            "coverage_id": row.get("coverage_id"),
            "warranty_heading": row.get("coverage_name"),     # PLAIN LANGUAGE label (not the code)
            "context_confidence_score": cx["context_confidence_score"],
            "matched_context_summary": cx["matched_context_summary"],
            "why_matched": cx["why_matched"],
            "page_number": cx["page_number"],
            "chunk_id": cx["chunk_id"],
            "decision": decision,
            "asset_eligibility": elig,
            "explanation": _clause_explanation(decision, row, elig, interp_public),
        })

    # sort by confidence, re-rank
    clause_results.sort(key=lambda c: c["context_confidence_score"], reverse=True)
    for i, c in enumerate(clause_results, start=1):
        c["rank"] = i

    # 9) overall summary
    primary = clause_results[0]
    overall_decision = "INFORMATION_ONLY" if (has_limited and no_inputs) else primary["decision"]
    user_message = _multi_user_message(reported_defect, interp_public, clause_results, excl, has_limited and no_inputs)

    return {
        "responseType": "multi_decision",
        "request_id": _request_id(),
        "primary_decision": overall_decision,
        "overall_confidence_score": primary["context_confidence_score"],
        "defect_interpretation": interp_public,
        "asset": {k: asset.get(k) for k in ("make", "model", "model_year", "vin", "purchase_date", "current_mileage")},
        "exclusions_checked": excl.get("exclusions_checked", []),
        "clause_results": clause_results,
        "user_message": user_message,
        # back-compat fields so the old card still has something:
        "coverageDecision": overall_decision,
        "answer": user_message,
        "confidence": primary["context_confidence_score"],
        "filters": {},
        "context": {**context, "selectedCoverageId": None},
    }
