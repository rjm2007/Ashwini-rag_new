import json
from pathlib import Path
from ..services.llm_service import LlmService


def extract_metadata_filters(question: str) -> dict:
    """This function extracts make/model/year/component hints from user question."""
    llm = LlmService()
    prompt = Path("src/query/prompts/query_metadata_extraction.txt").read_text(encoding="utf-8")
    output = llm.small_model_call(f"{prompt}\n\nQuestion: {question}", "Extract metadata filters.")
    try:
        return json.loads(output)
    except json.JSONDecodeError:
        return {}
