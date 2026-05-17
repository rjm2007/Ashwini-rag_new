import json
from pathlib import Path
from ..services.llm_service import LlmService


def reason_over_evidence(question: str, history: list[dict], chunks: list[dict]) -> dict:
    """This function asks the large model to answer strictly from evidence chunks."""
    llm = LlmService()
    prompt = Path("src/query/prompts/final_reasoning.txt").read_text(encoding="utf-8")
    formatted_chunks = "\n".join(
        [f"[{index + 1}] page={item['payload'].get('pageNumber')} text={item['payload'].get('chunkText')}" for index, item in enumerate(chunks)]
    )
    formatted_history = "\n".join([f"{item.get('role')}: {item.get('content')}" for item in history])
    response = llm.large_model_call(
        prompt=f"{prompt}\n\nConversation:\n{formatted_history}\n\nQuestion:\n{question}\n\nEvidence:\n{formatted_chunks}",
        system_message="Reason only from provided evidence.",
    )
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        return {
            "answer": "Insufficient certified evidence to answer confidently.",
            "evidence_used": [],
            "coverage_decision": "insufficient_evidence",
            "reasoning": response,
            "confidence_factors": {
                "evidence_strength": 0.3,
                "clause_clarity": 0.3,
                "metadata_match": 0.3,
            },
        }
