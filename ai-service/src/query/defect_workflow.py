"""Defect → match → disambiguate → eligibility → decision workflow."""

from __future__ import annotations

import json
import logging
import re

from sqlalchemy import text

from .coverage_decider import decide_coverage, plain_language_explanation
from .defect_classifier import classify_defect
from .defect_matcher import match_coverage_rows
from .document_resolver import resolve_documents_by_make_model_year
from .eligibility_engine import build_eligibility_prompt, missing_eligibility_fields
from .retriever import retrieve_chunks
from ..database import SessionLocal

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


def _needs_eligibility(row: dict, missing: list[str], context: dict) -> dict:
    return {
        "responseType": "needs_eligibility",
        "prompt": build_eligibility_prompt(missing, row),
        "fields": missing,
        "coverage": row,
        "answer": build_eligibility_prompt(missing, row),
        "evidence": [],
        "confidence": 0.7,
        "filters": {},
        "context": {**context, "selectedCoverageId": row.get("coverage_id")},
    }


def _eligibility_blocked(row: dict, eligibility: dict | None) -> list[str]:
    missing = missing_eligibility_fields(row, eligibility)
    period = row.get("coverage_period") or {}
    elig = eligibility or {}
    if period.get("duration_months") is not None and not elig.get("purchase_date"):
        if "purchase_date" not in missing:
            missing.append("purchase_date")
    if period.get("mileage_limit") is not None and not elig.get("current_mileage"):
        if "current_mileage" not in missing:
            missing.append("current_mileage")
    return missing


def _build_decision_response(
    question: str,
    row: dict,
    eligibility: dict,
    context: dict,
) -> dict:
    missing = _eligibility_blocked(row, eligibility)
    if missing:
        return _needs_eligibility(row, missing, context)

    verdict = decide_coverage(row, eligibility)
    exclusions, conditions = _load_doc_exclusions(row.get("_documentId"))
    chunks = retrieve_chunks(
        question,
        {"documentId": row.get("_documentId"), "coverage_id": row.get("coverage_id")},
        list_mode=False,
    )
    explanation = plain_language_explanation(verdict, row)
    evidence = []
    for chunk in chunks[:3]:
        payload = chunk.get("payload") or {}
        evidence.append(
            {
                "page": payload.get("page"),
                "text_reference": payload.get("text") or payload.get("text_reference"),
                "quote": payload.get("text") or payload.get("quote"),
                "coverageId": row.get("coverage_id"),
            }
        )

    return {
        "responseType": "decision",
        "coverageDecision": verdict.get("decision"),
        "explanation": explanation,
        "matchedComponent": {
            "coverage_id": row.get("coverage_id"),
            "coverage_name": row.get("coverage_name"),
            "hierarchy": row.get("coverage_hierarchy"),
        },
        "durationMonths": verdict.get("duration_months"),
        "mileageLimit": verdict.get("mileage_limit"),
        "mileageUnit": verdict.get("mileage_unit"),
        "checks": verdict.get("checks") or [],
        "evidence": evidence,
        "exclusions": exclusions,
        "conditions": conditions,
        "limitOfLiability": row.get("limit_of_liability"),
        "deductible": row.get("deductible"),
        "planTier": row.get("plan_tier"),
        "confidence": round(0.6 + 0.3 * float(row.get("_match_score") or 0.5), 2),
        "decision": verdict,
        "answer": explanation,
        "coverage": row,
        "filters": {"coverage_id": row.get("coverage_id")},
        "context": {**context, "selectedCoverageId": row.get("coverage_id")},
    }


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


def handle_defect_workflow(
    question: str,
    context: dict,
    document_id: str | None,
    conversation_history: list[dict],
) -> dict:
    selected_id = context.get("selectedCoverageId")
    eligibility = context.get("eligibility") or {}

    docs = resolve_documents_by_make_model_year(
        context.get("make"),
        context.get("model"),
        context.get("year"),
        document_id=document_id,
    )
    if not docs:
        return {
            "responseType": "answer",
            "answer": "I need a certified warranty document to match coverage.",
            "evidence": [],
            "confidence": 0.3,
            "filters": {},
            "context": context,
        }

    all_rows = _collect_rows(docs)

    if selected_id:
        matched = [r for r in all_rows if str(r.get("coverage_id")) == str(selected_id)]
        if not matched:
            return {
                "responseType": "answer",
                "answer": f"Coverage {selected_id} was not found in ingested data.",
                "evidence": [],
                "confidence": 0.2,
                "filters": {},
                "context": context,
            }
        return _build_decision_response(question, matched[0], eligibility, context)

    classification = classify_defect(
        question,
        make=context.get("make"),
        model=context.get("model"),
        year=context.get("year"),
    )
    candidates = match_coverage_rows(all_rows, classification.get("candidate_targets") or [])
    if not candidates:
        return {
            "responseType": "answer",
            "answer": (
                "I could not match this defect to any coverage row in the certified documents. "
                "Try describing the component or system more specifically."
            ),
            "evidence": [],
            "confidence": 0.35,
            "filters": {},
            "context": context,
        }
    if len(candidates) > 1 and not selected_id:
        return {
            "responseType": "disambiguation",
            "prompt": "I found multiple possible matches. Which best matches your issue?",
            "candidates": [
                {
                    "coverage_id": c.get("coverage_id"),
                    "label": f"{c.get('coverage_id')}: {c.get('coverage_name')}",
                    "documentId": c.get("_documentId"),
                }
                for c in candidates
            ],
            "answer": "I found multiple possible matches. Which best matches your issue?",
            "evidence": [],
            "confidence": 0.7,
            "filters": {},
            "context": context,
        }

    return _build_decision_response(question, candidates[0], eligibility, context)


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

    # (1) A coverage has been selected (disambiguation) OR eligibility is being submitted against a
    #     pinned coverage -> always continue the defect workflow, regardless of message text/intent.
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
