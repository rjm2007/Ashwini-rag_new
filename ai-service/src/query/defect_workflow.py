"""Defect → match → disambiguate → eligibility → decision workflow."""

from __future__ import annotations

import logging
import re

from .coverage_decider import decide_coverage
from .defect_classifier import classify_defect
from .defect_matcher import match_coverage_rows
from .document_resolver import resolve_documents_by_make_model_year
from .eligibility_engine import build_eligibility_prompt, missing_eligibility_fields
from .retriever import retrieve_chunks
from ..services.warranty_chunk_builder import extract_coverage_facts

logger = logging.getLogger(__name__)

_LIST_RE = re.compile(
    r"\b(list|show|all)\b.*\b(coverage|coverages|components)\b", re.IGNORECASE
)
_CODE_RE = re.compile(r"\b([A-Z]\d{3,4})\b")
_DEFECT_RE = re.compile(
    r"\b(broken|leak|noise|failed|failure|defect|issue|problem|hard to|won'?t|doesn'?t)\b",
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


def handle_list_coverage(context: dict, document_id: str | None) -> dict:
    docs = resolve_documents_by_make_model_year(
        context.get("make"),
        context.get("model"),
        context.get("year"),
        document_id=document_id,
    )
    rows = _collect_rows(docs)
    return {
        "responseType": "coverage_list",
        "coverages": [
            {
                "coverage_id": r.get("coverage_id"),
                "coverage_name": r.get("coverage_name"),
                "coverage_type": r.get("coverage_type"),
                "coverage_period": r.get("coverage_period"),
                "documentId": r.get("_documentId"),
            }
            for r in rows
        ],
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
            "answer": "I need make/model (and year if available) to match warranty coverage.",
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
        row = matched[0]
        missing = missing_eligibility_fields(row, eligibility)
        if missing:
            return {
                "responseType": "needs_eligibility",
                "prompt": build_eligibility_prompt(missing, row),
                "fields": missing,
                "coverage": row,
                "answer": build_eligibility_prompt(missing, row),
                "evidence": [],
                "confidence": 0.7,
                "filters": {},
                "context": {**context, "selectedCoverageId": selected_id},
            }
        verdict = decide_coverage(row, eligibility)
        chunks = retrieve_chunks(
            question,
            {"documentId": row.get("_documentId"), "coverage_id": row.get("coverage_id")},
            list_mode=False,
        )
        return {
            "responseType": "decision",
            "decision": verdict,
            "coverageDecision": verdict.get("decision"),
            "answer": "; ".join(verdict.get("reasons") or []),
            "coverage": row,
            "evidence": [c.get("payload") for c in chunks[:3]],
            "confidence": 0.85,
            "filters": {"coverage_id": row.get("coverage_id")},
            "context": context,
        }

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

    row = candidates[0]
    missing = missing_eligibility_fields(row, eligibility)
    if missing:
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
    verdict = decide_coverage(row, eligibility)
    return {
        "responseType": "decision",
        "decision": verdict,
        "coverageDecision": verdict.get("decision"),
        "answer": "; ".join(verdict.get("reasons") or []),
        "coverage": row,
        "evidence": [],
        "confidence": 0.8,
        "filters": {"coverage_id": row.get("coverage_id")},
        "context": {**context, "selectedCoverageId": row.get("coverage_id")},
    }


def route_specialized_query(
    question: str,
    context: dict | None,
    document_id: str | None,
    conversation_history: list[dict],
    intent: str,
) -> dict | None:
    context = context or {}
    if intent == "list_coverage" or _LIST_RE.search(question or ""):
        return handle_list_coverage(context, document_id)
    if _CODE_RE.search(question or ""):
        lookup = handle_coverage_lookup(question, context, document_id)
        if lookup:
            return lookup
    if intent == "defect_report" or _DEFECT_RE.search(question or ""):
        return handle_defect_workflow(question, context, document_id, conversation_history)
    return None
