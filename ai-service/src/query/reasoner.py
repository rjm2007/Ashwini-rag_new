import json
from datetime import date
from pathlib import Path
from ..services.llm_service import LlmService


def _map_krones_answer_status(status: str) -> str:
    key = (status or "").upper().replace("-", "_")
    return {
        "ANSWERED": "answered",
        "PARTIAL": "partial",
        "NOT_IN_DOCUMENT": "not_in_document",
        "NEEDS_CLARIFICATION": "needs_clarification",
    }.get(key, "not_in_document")


def reason_over_evidence(
    question: str,
    history: list[dict],
    chunks: list[dict],
    *,
    table_mode: bool = False,
    schema_facts: list[dict] | None = None,
    document_type: str | None = None,
) -> dict:
    """This function asks the large model to answer strictly from evidence chunks."""
    llm = LlmService()
    is_krones = document_type == "krones_supplier_doc"
    if is_krones:
        prompt = (
            Path(__file__).resolve().parent.parent / "krones" / "prompts" / "krones_answer.txt"
        ).read_text(encoding="utf-8")
    else:
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

    # Build compact structured facts block if available (from master_schema_json).
    schema_block = ""
    if schema_facts:
        lines: list[str] = []
        for fact in schema_facts:
            if is_krones:
                lines.append(f"## Document: {fact.get('document') or 'Krones doc'} (doc {fact.get('documentId')})")
                for req in (fact.get("requirements") or [])[:40]:
                    if isinstance(req, dict):
                        lines.append(f"- REQ: {req.get('requirement', '')} [{req.get('section_no', '')}]")
                for rt in (fact.get("request_types") or [])[:20]:
                    if isinstance(rt, dict):
                        lines.append(f"- REQUEST: {rt.get('request_type', '')}")
                for std in (fact.get("standards") or [])[:20]:
                    if isinstance(std, dict):
                        lines.append(f"- STD: {std.get('standard_code', '')}")
            else:
                lines.append(f"## Vehicle: {fact.get('vehicle') or 'Unknown vehicle'} (doc {fact.get('documentId')})")
                for code in fact.get("coverage_codes", []):
                    limit = " / ".join(
                        part for part in (code.get("duration"), code.get("distance")) if part
                    )
                    period = f"{code.get('start_date') or '?'} to {code.get('end_date') or '?'}"
                    lines.append(
                        f"- {code.get('code')}: {code.get('description', '')} | {limit} | {period}"
                    )
        facts_text = "\n".join(lines)
        if len(facts_text) > 8000:
            facts_text = facts_text[:8000] + "\n... (truncated)"
        if is_krones:
            schema_block = (
                "\n\nSTRUCTURED KRONES FACTS (authoritative — cite as schema-derived):\n"
                f"{facts_text}\n"
            )
        else:
            schema_block = (
                "\n\nSTRUCTURED COVERAGE FACTS (authoritative, extracted by the pipeline - "
                "use this as the complete list of coverage codes and for list, compare, "
                "count, and date questions; cite as schema-derived):\n"
                f"{facts_text}\n"
            )

    today = date.today().isoformat()
    response = llm.large_model_call(
        prompt=(
            f"{prompt}{schema_block}\n\nTODAY'S DATE: {today}\n\n"
            f"Conversation:\n{formatted_history}\n\nQuestion:\n{question}\n\n"
            f"Evidence:\n{formatted_chunks}"
        ),
        system_message=(
            "Reason only from provided Krones supplier evidence."
            if is_krones
            else "Reason only from provided evidence and structured coverage facts."
        ),
    )
    try:
        parsed = json.loads(response)
        if is_krones:
            status = parsed.get("answer_status") or parsed.get("coverage_decision")
            parsed["coverage_decision"] = _map_krones_answer_status(str(status or ""))
        return parsed
    except json.JSONDecodeError:
        fallback_decision = "not_in_document" if is_krones else "insufficient_evidence"
        return {
            "answer": "Insufficient certified evidence to answer confidently.",
            "evidence_used": [],
            "coverage_decision": fallback_decision,
            "reasoning": response,
            "confidence_factors": {
                "evidence_strength": 0.3,
                "clause_clarity": 0.3,
                "metadata_match": 0.3,
            },
        }

