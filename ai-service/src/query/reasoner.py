import json
from pathlib import Path
from ..services.llm_service import LlmService


def reason_over_evidence(
    question: str,
    history: list[dict],
    chunks: list[dict],
    *,
    table_mode: bool = False,
    schema_context: dict | None = None,
) -> dict:
    """This function asks the large model to answer strictly from evidence chunks."""
    llm = LlmService()
    prompts_dir = Path(__file__).resolve().parent / "prompts"
    prompt_name = "table_list_reasoning.txt" if table_mode else "final_reasoning.txt"
    prompt = (prompts_dir / prompt_name).read_text(encoding="utf-8")
    parts = []
    for index, item in enumerate(chunks):
        p = item["payload"]
        header = f"[{index + 1}] page={p.get('pageNumber')} doc={p.get('filename', '?')}"
        if p.get("chunkType"):
            header += f" type={p.get('chunkType')}"
        codes = p.get("coverageCodes") or []
        if codes:
            header += f" codes={','.join(str(c) for c in codes[:8])}"
        if p.get("sectionTitle"):
            header += f" section={p.get('sectionTitle')}"
        body = p.get("chunkText") or ""
        snippet = p.get("retrievalSnippet")
        if snippet and snippet != body:
            parts.append(f"{header}\nmatched_row={snippet}\ncontext=\n{body}")
        else:
            parts.append(f"{header}\ntext={body}")
    formatted_chunks = "\n\n".join(parts)
    formatted_history = "\n".join([f"{item.get('role')}: {item.get('content')}" for item in history])

    # Build structured schema block if available (from master_schema_json)
    schema_block = ""
    if schema_context:
        schema_json = json.dumps(schema_context, indent=2, default=str)
        # Truncate to avoid blowing up the context window
        if len(schema_json) > 6000:
            schema_json = schema_json[:6000] + "\n... (truncated)"
        schema_block = (
            "\n\nSTRUCTURED DOCUMENT DATA (extracted by pipeline — use this for factual lookups like VIN, "
            "make, model, coverage codes, exclusions, dates):\n"
            f"{schema_json}\n"
        )

    response = llm.large_model_call(
        prompt=f"{prompt}{schema_block}\n\nConversation:\n{formatted_history}\n\nQuestion:\n{question}\n\nEvidence:\n{formatted_chunks}",
        system_message="Reason only from provided evidence and structured document data.",
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

