from .intent_classifier import classify_intent
from .metadata_filter import extract_metadata_filters
from .retriever import retrieve_chunks
from .reasoner import reason_over_evidence


def compute_confidence(result: dict) -> float:
    """This function calculates one confidence number from factor scores."""
    factors = result.get("confidence_factors", {})
    values = [
        float(factors.get("evidence_strength", 0)),
        float(factors.get("clause_clarity", 0)),
        float(factors.get("metadata_match", 0)),
    ]
    return round(sum(values) / len(values), 2) if values else 0.0


async def answer_question(question: str, conversation_history: list[dict]) -> dict:
    """This function orchestrates intent, filtering, retrieval, reasoning, and response format."""
    intent = classify_intent(question)
    if intent == "out_of_scope":
        return {
            "answer": "I can only answer warranty coverage questions based on certified documents.",
            "evidence": [],
            "confidence": 0.1,
            "filters": {},
        }

    filters = extract_metadata_filters(question)
    chunks = retrieve_chunks(question, filters)
    reasoned = reason_over_evidence(question, conversation_history, chunks)
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
        "coverageDecision": reasoned.get("coverage_decision", "insufficient_evidence"),
    }
