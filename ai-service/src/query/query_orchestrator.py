import json
import logging

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
    intent = classification.get("intent", "warranty_coverage")

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
    chunks = retrieve_chunks(question, metadata, list_mode=list_mode)

    target_docs = _target_document_ids(chunks, document_id)
    schema_facts = _load_schema_facts(target_docs)
    if schema_facts:
        logger.info("Injecting schema facts for documents=%s", target_docs)

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
