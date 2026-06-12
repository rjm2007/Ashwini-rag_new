"""Act 1 header extraction for Krones — populates required doc fields before certification."""

from __future__ import annotations

import json
import logging
import re

from sqlalchemy import text

from ..database import SessionLocal
from ..services.llm_service import LlmService
from .required_fields import has_krones_required_fields
from .type_detect import infer_doc_category

logger = logging.getLogger("krones.act1_header")

_FW = lambda v, c=0.85: {"value": v, "status": "extracted", "confidence": c, "page": 1}

_ISSUER_HINTS = [
    (re.compile(r"Krones AG", re.I), "Krones AG"),
    (re.compile(r"Krones Hungary Kft", re.I), "Krones Hungary Kft."),
    (re.compile(r"Corporate Quality Management", re.I), "Krones AG — Corporate Quality Management"),
]


def _regex_header(text: str, filename: str) -> dict:
    doc: dict = {}
    title = None
    if re.search(r"supplier\s+handbook", text, re.I):
        title = "Krones Supplier Handbook"
    elif re.search(r"long[- ]term\s+supplier\s+declaration|LTSD", text, re.I):
        title = "Instruction to fill out a Long-Term Supplier Declaration"
    elif re.search(r"ticket\s+management|Supplier Requests Service Management", text, re.I):
        title = "Ticket Management System for Suppliers"
    if title:
        doc["doc_title"] = _FW(title)

    ver = re.search(r"\b(\d{1,2}/\d{4})\b", text[:2000])
    if ver:
        doc["version"] = _FW(ver.group(1))
    ver2 = re.search(r"\b(\d{2}\.\d{2}\.\d{4})\b", text[:2000])
    if ver2 and "version" not in doc:
        doc["version"] = _FW(ver2.group(1))

    for pat, issuer in _ISSUER_HINTS:
        if pat.search(text[:3000]):
            doc["issuer"] = _FW(issuer)
            break

    cat = infer_doc_category(filename, text)
    doc["doc_category"] = _FW(cat)
    doc["document_language"] = _FW("en")
    conf = "Internal" if re.search(r"\bInternal\b", text[:1500]) else "Binding"
    if re.search(r"\bBinding\b", text[:1500]):
        conf = "Binding"
    doc["confidentiality"] = _FW(conf, 0.7)
    return doc


def run_krones_act1_header(document_id: str, structured: dict, filename: str = "") -> dict:
    text = (
        structured.get("readable_text")
        or structured.get("plain_text")
        or structured.get("md_content")
        or ""
    )[:12000]
    document = _regex_header(text, filename)

    if not has_krones_required_fields(document):
        try:
            llm = LlmService()
            raw = llm.small_model_call(
                prompt=(
                    "Extract JSON only: {document:{doc_title,doc_category,issuer,version}} "
                    "from Krones supplier PDF text. status must be extracted|missing.\n\n"
                    f"{text[:6000]}"
                ),
                system_message="Krones header extraction. JSON only.",
            )
            parsed = json.loads(raw.strip().strip("`").replace("```json", "").replace("```", ""))
            llm_doc = parsed.get("document") or parsed
            for k, v in llm_doc.items():
                if isinstance(v, dict) and v.get("value"):
                    document[k] = v
        except Exception as exc:
            logger.warning("[%s] Krones LLM header fallback failed: %s", document_id, exc)

    required_missing = not has_krones_required_fields(document)
    master_stub = {
        "document": document,
        "vehicle": {},
        "profiles": {"krones_supplier_doc": {}},
        "extensions": [],
    }

    with SessionLocal() as session:
        session.execute(
            text("""
                UPDATE documents
                SET master_schema_json = COALESCE(master_schema_json, '{}'::jsonb)
                    || CAST(:schema AS jsonb),
                    required_fields_missing = :req,
                    document_type = 'krones_supplier_doc',
                    updated_at = NOW()
                WHERE id = :id
            """),
            {
                "schema": json.dumps(master_stub),
                "req": required_missing,
                "id": document_id,
            },
        )
        session.commit()

    logger.info(
        "[%s] Krones act1 header required_missing=%s title=%s",
        document_id,
        required_missing,
        (document.get("doc_title") or {}).get("value"),
    )
    return {
        "required_missing": required_missing,
        "doc_title": (document.get("doc_title") or {}).get("value"),
        "issuer": (document.get("issuer") or {}).get("value"),
        "doc_category": (document.get("doc_category") or {}).get("value"),
    }
