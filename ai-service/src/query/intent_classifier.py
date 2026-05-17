import json
from pathlib import Path
from ..services.llm_service import LlmService


def classify_intent(question: str) -> str:
    """This function classifies whether query is coverage-related or out of scope."""
    llm = LlmService()
    prompt = Path("src/query/prompts/intent_classification.txt").read_text(encoding="utf-8")
    output = llm.small_model_call(f"{prompt}\n\nQuestion: {question}", "Classify intent.")
    try:
        payload = json.loads(output)
        return payload.get("intent", "warranty_coverage")
    except json.JSONDecodeError:
        return "warranty_coverage"
