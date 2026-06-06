import json
import logging
import re as _re

from sqlalchemy import text

from .intent_classifier import classify_intent
from .metadata_filter import extract_metadata_filters, qdrant_filters_from_metadata, _is_valid_year
from ..config import settings
from ..database import SessionLocal
from ..services.aggregation_engine import is_aggregation_query, aggregate
from ..services.reranker_service import is_list_or_filter_question
from ..services.structured_query_engine import is_simple_retrieval_query, is_structured_query
from .query_mode import is_hallucination_probe
from .retriever import retrieve_chunks
from .reasoner import reason_over_evidence
from ..services.schema_chunk_builder import extract_coverage_facts
logger = logging.getLogger(__name__)

_VIN_RE = _re.compile(r"\b([A-HJ-NPR-Z0-9]{17})\b")
_CHASSIS_RE = _re.compile(r"\bchassis\s*(?:id\s*)?(\d{5,6})\b", _re.IGNORECASE)
_UNIT_RE = _re.compile(r"\bunit\s*(\d{3,6})\b", _re.IGNORECASE)

GREETING_REPLY = (
    "Hi! I'm your Fixyee warranty assistant. "
    "Ask me about coverage, exclusions, claim codes, or a specific vehicle "
    "(make, model, year, or VIN) and I'll answer from your certified warranty documents."
)

OUT_OF_SCOPE_REPLY = (
    "I can only help with warranty coverage questions based on your certified warranty documents. "
    "Try asking whether a component is covered, what the warranty period is, or what applies to a specific VIN."
)

INJECTION_REPLY = (
    "I can't change document status or system settings from chat. "
    "Please ask a warranty coverage question, or use the review workflow in the app."
)


def compute_confidence(result: dict) -> float:
    factors = result.get("confidence_factors", {})
    values = [
        float(factors.get("evidence_strength", 0)),
        float(factors.get("clause_clarity", 0)),
        float(factors.get("metadata_match", 0)),
    ]
    return round(sum(values) / len(values), 2) if values else 0.0


def _is_simple_greeting(question: str) -> bool:
    text = (question or "").strip().lower().rstrip("!?.")
    return text in {
        "hi",
        "hello",
        "hey",
        "hola",
        "good morning",
        "good afternoon",
        "good evening",
        "hi there",
        "hello there",
    }


def _load_master_schema(document_id: str) -> dict | None:
    """Load master_schema_json from DB for a specific document."""
    try:
        with SessionLocal() as session:
            row = session.execute(
                text("SELECT master_schema_json FROM documents WHERE id = :id"),
                {"id": document_id},
            ).first()
        if row and row[0]:
            schema = row[0] if isinstance(row[0], dict) else json.loads(row[0])
            # Strip quality metadata to save tokens — the reasoner doesn't need it
            schema.pop("quality", None)
            return schema
    except Exception as exc:
        logger.warning("Failed to load master_schema for %s: %s", document_id, exc)
    return None


def _resolve_documents_from_question(question: str) -> list[str]:
    """Return certified documentIds for any VIN/chassis/unit named in the question."""
    vins = _VIN_RE.findall(question or "")
    chassis = _CHASSIS_RE.findall(question or "")
    units = _UNIT_RE.findall(question or "")
    if not (vins or chassis or units):
        return []
    ids: list[str] = []
    try:
        with SessionLocal() as session:
            for vin in vins:
                row = session.execute(
                    text(
                        "SELECT id FROM documents "
                        "WHERE current_repository='certified' "
                        "AND metadata_json->>'vin' = :v"
                    ),
                    {"v": vin},
                ).first()
                if row and str(row[0]) not in ids:
                    ids.append(str(row[0]))
            for ident in chassis + units:
                rows = session.execute(
                    text(
                        "SELECT id FROM documents "
                        "WHERE current_repository='certified' "
                        "AND (metadata_json->>'chassis_id' = :c "
                        "     OR metadata_json->>'unit_number' = :c)"
                    ),
                    {"c": ident},
                ).fetchall()
                for row in rows:
                    doc_id = str(row[0])
                    if doc_id not in ids:
                        ids.append(doc_id)
    except Exception as exc:
        logger.warning("_resolve_documents_from_question failed: %s", exc)
    return ids


def _dedupe_chunks_by_id(chunks: list[dict]) -> list[dict]:
    seen: set[str] = set()
    out: list[dict] = []
    for chunk in chunks:
        payload = chunk.get("payload") or {}
        key = str(payload.get("chunkId") or payload.get("id") or id(chunk))
        if key in seen:
            continue
        seen.add(key)
        out.append(chunk)
    return out


def _target_document_ids(chunks: list[dict], document_id: str | None) -> list[str]:
    """Ground on the scoped document, or on documents retrieved for global chat."""
    if document_id:
        return [document_id]
    ids: list[str] = []
    for chunk in chunks:
        did = (chunk.get("payload") or {}).get("documentId")
        if did and did not in ids:
            ids.append(did)
    return ids[:3]


def _load_schema_facts(document_ids: list[str]) -> list[dict]:
    """Load compact, complete coverage facts for retrieved/scoped documents."""
    if not document_ids:
        return []
    facts: list[dict] = []
    with SessionLocal() as session:
        for document_id in document_ids:
            row = session.execute(
                text(
                    "SELECT make, model, year, metadata_json, master_schema_json "
                    "FROM documents WHERE id = :id"
                ),
                {"id": document_id},
            ).first()
            if not row:
                continue
            metadata = row[3] if isinstance(row[3], dict) else {}
            master = row[4] if isinstance(row[4], dict) else {}
            vehicle_parts = [str(item) for item in (row[0], row[1], row[2]) if item]
            if metadata.get("vin"):
                vehicle_parts.append(f"VIN {metadata.get('vin')}")
            if metadata.get("chassis_id"):
                vehicle_parts.append(f"chassis {metadata.get('chassis_id')}")
            facts.append(
                {
                    "documentId": document_id,
                    "vehicle": " ".join(vehicle_parts).strip(),
                    "coverage_codes": extract_coverage_facts(master),
                }
            )
    return facts


async def answer_question(question: str, conversation_history: list[dict], document_id: str | None = None) -> dict:
    """Intent routing → metadata extraction → hybrid retrieval → large-model reasoning."""
    if _is_simple_greeting(question):
        return {
            "answer": GREETING_REPLY,
            "evidence": [],
            "confidence": 0.95,
            "filters": {},
            "intent": "greeting_or_smalltalk",
        }

    # Count / group-by / "all vehicles" → deterministic full-scan, not retrieval.
    if is_aggregation_query(question):
        logger.info("Aggregation path engaged for question: %.80s", question)
        return aggregate(question)

    classification = classify_intent(question, conversation_history)
    classification_intent = classification.get("intent", "warranty_coverage")
    intent = classification_intent

    if intent == "greeting_or_smalltalk":
        return {
            "answer": GREETING_REPLY,
            "evidence": [],
            "confidence": 0.95,
            "filters": {},
            "intent": intent,
        }

    if intent == "prompt_injection_attempt":
        return {
            "answer": INJECTION_REPLY,
            "evidence": [],
            "confidence": 0.1,
            "filters": {},
            "intent": intent,
        }

    if intent == "out_of_scope":
        return {
            "answer": OUT_OF_SCOPE_REPLY,
            "evidence": [],
            "confidence": 0.1,
            "filters": {},
            "intent": intent,
        }

    if intent == "invoice_lookup":
        intent = "warranty_coverage"

    if intent == "ambiguous":
        clarification = classification.get("clarification_question") or (
            "Which vehicle or component are you asking about? "
            "Please include make, model, year, or VIN if you can."
        )
        return {
            "answer": clarification,
            "evidence": [],
            "confidence": float(classification.get("confidence", 0.3)),
            "filters": {},
            "intent": intent,
        }

    metadata = extract_metadata_filters(question, conversation_history)
    filters = qdrant_filters_from_metadata(metadata)

    # When scoped to a specific document, override filters with documentId
    if document_id:
        metadata["_document_id"] = document_id
        filters = {"documentId": document_id}
        logger.info("Document-scoped query: documentId=%s", document_id)

    logger.info(
        "Query filters applied: %s | Query: %.80s | "
        "Extracted metadata: make=%s, model=%s, year=%s (valid=%s), "
        "mileage=%s, vin=%s, chassisId=%s",
        filters,
        question,
        metadata.get("make"),
        metadata.get("model"),
        metadata.get("year"),
        _is_valid_year(metadata.get("year")),
        metadata.get("mileage"),
        metadata.get("vin"),
        metadata.get("chassis_id") or metadata.get("chassisId"),
    )

    list_mode = is_list_or_filter_question(question)
    table_mode = (
        list_mode
        or is_hallucination_probe(question)
        or (settings.enable_structured_reasoning and is_structured_query(question))
    )
    # --- Resolve documents named in the question (VIN / chassis / unit) ---
    explicit_docs = _resolve_documents_from_question(question)

    # --- Retrieval: pin to resolved docs when intent needs evidence ---
    retrieval_intents = {
        "warranty_coverage", "comparison", "warranty_metadata_lookup",
        "followup_clarification", "invoice_lookup",
    }
    if explicit_docs and (intent in retrieval_intents or classification_intent in retrieval_intents):
        chunks = []
        for did in explicit_docs:
            chunks.extend(
                retrieve_chunks(question, {"documentId": did}, list_mode=list_mode)
            )
        chunks = _dedupe_chunks_by_id(chunks)
        logger.info("Retrieval pinned to resolved docs: %s (question-resolved)", explicit_docs)
    else:
        chunks = retrieve_chunks(question, metadata, list_mode=list_mode)

    # --- Schema-facts grounding ---
    target_docs = explicit_docs or _target_document_ids(chunks, document_id)
    schema_facts = _load_schema_facts(target_docs)
    if schema_facts:
        logger.info(
            "Schema grounding: docs=%s source=%s",
            target_docs,
            "question" if explicit_docs else "retrieval",
        )

    reasoned = reason_over_evidence(
        question,
        conversation_history,
        chunks,
        table_mode=table_mode,
        schema_facts=schema_facts,
    )

    evidence = []
    for index in reasoned.get("evidence_used", []):
        position = index - 1
        if position >= 0 and position < len(chunks):
            evidence.append(chunks[position]["payload"])

    return {
        "answer": reasoned.get("answer", "No answer generated."),
        "evidence": evidence,
        "confidence": compute_confidence(reasoned),
        "filters": filters,
        "metadata": metadata,
        "coverageDecision": reasoned.get("coverage_decision", "insufficient_evidence"),
        "intent": intent,
        "queryMode": {
            "structured": settings.enable_structured_reasoning and is_structured_query(question),
            "simpleRetrieval": is_simple_retrieval_query(question),
            "tableMode": table_mode,
        },
    }
