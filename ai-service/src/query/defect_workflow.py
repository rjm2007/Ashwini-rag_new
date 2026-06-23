"""Defect → match → disambiguate → eligibility → decision workflow."""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime
import uuid
from pathlib import Path

from sqlalchemy import text

from .coverage_decider import decide_coverage, plain_language_explanation, decide_warranty, _overall_confidence
from .defect_classifier import classify_defect, interpret_defect, _parse_json
from .defect_matcher import match_coverage_rows
from .document_resolver import resolve_documents_by_make_model_year
from .eligibility_engine import build_eligibility_prompt, missing_eligibility_fields, compute_asset_eligibility, has_limits
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


def _request_id() -> str:
    return f"WRG-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4().int)[:6]}"


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


def _asset_from_context(context: dict, document_id: str | None) -> dict:
    appl = {}
    if document_id:
        try:
            with SessionLocal() as session:
                row = session.execute(
                    text("SELECT master_schema_json FROM documents WHERE id = :id"),
                    {"id": document_id},
                ).first()
            if row and row[0]:
                schema = row[0] if isinstance(row[0], dict) else json.loads(row[0])
                appl = schema.get("applicability") or schema.get("asset_context") or {}
        except Exception:
            pass
    eligibility = context.get("eligibility", {})
    models = appl.get("models")
    return {
        "make": appl.get("make", context.get("make")),
        "model": context.get("model") if not models else (models[0] if isinstance(models, list) else models),
        "model_year": context.get("year"),
        "vin": context.get("vin"),
        "current_mileage": eligibility.get("current_mileage"),
        "purchase_date": eligibility.get("purchase_date"),
        "_applicability": appl
    }


def build_matched_context(reported_defect: str, matched_rows: list[dict], document_id: str | None, document_name: str | None, llm: LlmService) -> list[dict]:
    _PROMPT = (Path(__file__).resolve().parent / "prompts" / "context_why_matched.txt").read_text(encoding="utf-8")
    ctx = []
    for rank, row in enumerate(matched_rows, start=1):
        chunks = retrieve_chunks(f"{row.get('coverage_name')} {reported_defect}",
                                 {"documentId": document_id, "coverage_id": row.get("coverage_id")}, list_mode=False)
        top = (chunks or [{}])[0].get("payload", {})
        out = llm.small_model_call(json.dumps({
            "reported_defect": reported_defect,
            "warranty_heading": row.get("coverage_name"),
            "chunk_text": top.get("text") or row.get("source_reference",{}).get("text_reference",""),
        }), _PROMPT, stage="why_matched", document_id=document_id)
        try:
            j = _parse_json(out)
        except Exception:
            j = {}
        ctx.append({
            "rank": rank,
            "coverage_id": row.get("coverage_id"),
            "warranty_heading": row.get("coverage_name"),
            "document_name": document_name,
            "page_number": (row.get("source_reference") or {}).get("page") or top.get("page"),
            "chunk_id": top.get("chunk_id") or f"{document_id}-CHUNK-{rank:04d}",
            "context_confidence_score": round(float(j.get("context_confidence_score", row.get("_match_score") or 0.6)), 2),
            "matched_context_summary": j.get("matched_context_summary", ""),
            "why_matched": j.get("why_matched", ""),
        })
    ctx.sort(key=lambda c: float(c.get("context_confidence_score", 0)), reverse=True)
    for i, c in enumerate(ctx, start=1):
        c["rank"] = i
    return ctx


def check_exclusions(defect_interpretation: dict, doc_exclusions: list[dict], llm: LlmService) -> dict:
    _PROMPT = (Path(__file__).resolve().parent / "prompts" / "exclusion_check.txt").read_text(encoding="utf-8")
    if not doc_exclusions and (defect_interpretation.get("is_wear_or_consumable") or defect_interpretation.get("is_accident_or_misuse")):
        heading = "Normal Wear Items" if defect_interpretation.get("is_wear_or_consumable") else "Accident & Misuse"
        return {
            "exclusions_checked": [{
                "warranty_heading": heading,
                "page_number": None,
                "exclusion_confidence_score": 0.95,
                "exclusion_result": "Strong exclusion found",
                "explanation": f"The reported defect is interpreted as a standard {heading} exclusion."
            }],
            "strong_exclusion": True
        }
    if not doc_exclusions:
        return {"exclusions_checked": [], "strong_exclusion": False}
    out = llm.small_model_call(json.dumps({
        "interpreted_defect": defect_interpretation,
        "warranty_exclusions": doc_exclusions
    }), _PROMPT)
    try:
        return _parse_json(out)
    except Exception:
        return {"exclusions_checked": [], "strong_exclusion": False}


def compose_final(decision: str, asset_eligibility: dict, defect_interpretation: dict, matched_context: list[dict], exclusions_checked: dict, llm: LlmService) -> dict:
    _PROMPT = (Path(__file__).resolve().parent / "prompts" / "final_explanation.txt").read_text(encoding="utf-8")
    out = llm.small_model_call(json.dumps({
        "decision": decision,
        "asset_eligibility": asset_eligibility,
        "defect_interpretation": defect_interpretation,
        "matched_context": matched_context,
        "exclusions_checked": exclusions_checked
    }), _PROMPT)
    try:
        return _parse_json(out)
    except Exception:
        return {
            "final_explanation": f"Decision: {decision}.",
            "recommended_action": "Review the warranty document.",
            "user_message": f"**Warranty Status: {decision.replace('_', ' ').title()}**\n\nPlease review the full document."
        }


def interp_public(interp: dict) -> dict:
    return {
        "reported_defect": interp.get("interpreted_component", "Unknown"),
        "interpreted_component": interp.get("interpreted_component"),
        "interpreted_failure_type": interp.get("interpreted_failure_type"),
        "defect_category": interp.get("defect_category")
    }


def _information_only_response(interp: dict, asset: dict, context: dict, matched_context: list[dict]) -> dict:
    return {
        "responseType": "decision",
        "request_id": _request_id(),
        "decision": "INFORMATION_ONLY",
        "overall_confidence_score": matched_context[0].get("context_confidence_score", 0.4) if matched_context else 0.4,
        "asset_eligibility": {
            "purchase_date": None,
            "current_mileage": None,
            "make_match": None,
            "model_match": None,
            "model_year_match": None,
            "time_eligible": None,
            "mileage_eligible": None,
            "warranty_mileage_limit": None,
            "warranty_expiration_date": None
        },
        "defect_interpretation": interp_public(interp),
        "matched_warranty_context": matched_context,
        "exclusions_checked": [],
        "final_explanation": "Warranty has limits but no purchase date or mileage was provided. Information only.",
        "recommended_action": "Provide in-service/purchase date and current mileage for a coverage decision.",
        "user_message": "**Warranty Status: Information Only**\n\nWithout an in-service/purchase date and current mileage, this is information only and not a coverage decision.",
        "coverageDecision": "INFORMATION_ONLY",
        "explanation": "Information only.",
        "answer": "**Warranty Status: Information Only**\n\nWithout an in-service/purchase date and current mileage, this is information only and not a coverage decision.",
        "confidence": 0.4,
        "context": context
    }


def _build_decision_response(
    question: str,
    row_or_rows: dict | list[dict],
    eligibility: dict,
    context: dict,
    document_id: str | None = None,
    reported_defect: str = "",
) -> dict:
    llm = LlmService()
    asset = _asset_from_context(context, document_id)
    interp = interpret_defect(reported_defect, asset, llm)

    matched_rows = row_or_rows if isinstance(row_or_rows, list) else [row_or_rows]
    document_name = _document_name(document_id)
    matched_context = build_matched_context(reported_defect, matched_rows, document_id, document_name, llm)

    if has_limits(row_or_rows) and not eligibility.get("purchase_date") and not eligibility.get("current_mileage"):
        return _information_only_response(interp, asset, context, matched_context)

    elig = compute_asset_eligibility(row_or_rows, asset, eligibility)

    doc_excl, _ = _load_doc_exclusions(document_id)
    excl = check_exclusions(interp, doc_excl, llm)

    decision = decide_warranty(elig, matched_context, excl, interp)
    overall = _overall_confidence(decision, matched_context, excl)

    composed = compose_final(decision, elig, interp, matched_context, excl, llm)

    return {
        "responseType": "decision",
        "request_id": _request_id(),
        "decision": decision,
        "overall_confidence_score": overall,
        "asset_eligibility": elig,
        "defect_interpretation": interp_public(interp),
        "matched_warranty_context": matched_context,
        "exclusions_checked": excl.get("exclusions_checked", []),
        "final_explanation": composed.get("final_explanation", ""),
        "recommended_action": composed.get("recommended_action", ""),
        "user_message": composed.get("user_message", ""),
        # back-compat
        "coverageDecision": decision,
        "explanation": composed.get("final_explanation", ""),
        "answer": composed.get("user_message", ""),
        "confidence": overall,
        "context": {**context, "selectedCoverageId": matched_rows[0].get("coverage_id") if matched_rows else None},
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
        return _build_decision_response(question, matched[0], eligibility, context, document_id, question)

    llm = LlmService()
    asset = _asset_from_context(context, document_id)
    interp = interpret_defect(question, asset, llm)
    
    candidates = match_coverage_rows(all_rows, interp.get("candidate_targets") or [])
    if not candidates:
        # Before failing, if it's a strong exclusion, we might still want to output it
        if interp.get("is_wear_or_consumable") or interp.get("is_accident_or_misuse"):
            return _build_decision_response(question, [], eligibility, context, document_id, question)

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
        document_name = _document_name(document_id)
        candidates_ctx = build_matched_context(question, candidates, document_id, document_name, llm)
        return {
            "responseType": "disambiguation",
            "prompt": "I found multiple possible matches. Which best matches your issue?",
            "candidates": [
                {
                    "coverage_id": c.get("coverage_id"),
                    "warranty_heading": c.get("warranty_heading"),
                    "context_confidence_score": c.get("context_confidence_score"),
                    "why_matched": c.get("why_matched")
                } for c in candidates_ctx
            ],
            "answer": "I found multiple possible matches. Which best matches your issue?",
            "evidence": [],
            "confidence": 0.7,
            "filters": {},
            "context": context,
        }

    return _build_decision_response(question, candidates[0], eligibility, context, document_id, question)


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
