"""Build retrieval chunks from Krones master schema."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger("krones.chunk_builder")


def _fw(value: Any) -> Any:
    if isinstance(value, dict) and "value" in value:
        if value.get("status") == "missing":
            return None
        return value.get("value")
    return value


def _clean(v: Any) -> str:
    return str(v).strip() if v is not None else ""


def build_doc_context(document: dict) -> str:
    parts = [
        _clean(_fw(document.get("doc_title"))),
        _clean(_fw(document.get("issuer"))),
        _clean(_fw(document.get("version"))),
        _clean(_fw(document.get("doc_category"))),
    ]
    return ", ".join(p for p in parts if p) or "Krones supplier document"


def build_krones_schema_chunks(master: dict, document_id: str) -> list[dict]:
    """One chunk per requirements, standards, request types, etc."""
    doc = master.get("document") or {}
    profile = (master.get("profiles") or {}).get("krones_supplier_doc") or {}
    ctx = build_doc_context(doc)
    chunks: list[dict] = [
        {
            "pageNumber": 1,
            "sectionHeading": "Document identification",
            "chunkText": f"Krones supplier document. {ctx}.",
            "chunkType": "krones_header",
        }
    ]

    for req in profile.get("requirements") or []:
        if not isinstance(req, dict):
            continue
        text = (
            f"{ctx}. Requirement: {_clean(req.get('requirement'))}. "
            f"Category: {_clean(req.get('category'))}. "
            f"Standard: {_clean(req.get('reference_standard'))}. "
            f"Section {_clean(req.get('section_no'))}."
        )
        chunks.append(
            {
                "pageNumber": 1,
                "sectionHeading": _clean(req.get("section_no")) or "Requirement",
                "chunkText": text,
                "chunkType": "krones_requirement",
                "sectionNo": _clean(req.get("section_no")),
            }
        )

    for std in profile.get("referenced_standards") or []:
        if not isinstance(std, dict):
            continue
        chunks.append(
            {
                "pageNumber": 1,
                "sectionHeading": _clean(std.get("standard_code")),
                "chunkText": (
                    f"{ctx}. Standard {_clean(std.get('standard_code'))}: "
                    f"{_clean(std.get('context'))}. Section {_clean(std.get('section_no'))}."
                ),
                "chunkType": "krones_standard",
                "standardCode": _clean(std.get("standard_code")),
            }
        )

    for rt in profile.get("request_types") or []:
        if not isinstance(rt, dict):
            continue
        chunks.append(
            {
                "pageNumber": 1,
                "sectionHeading": _clean(rt.get("request_type")),
                "chunkText": (
                    f"{ctx}. Request type: {_clean(rt.get('request_type'))}. "
                    f"Category: {_clean(rt.get('parent_category'))}. "
                    f"Reason: {_clean(rt.get('reason'))}."
                ),
                "chunkType": "krones_request_type",
                "requestType": _clean(rt.get("request_type")),
            }
        )

    for step in profile.get("process_steps") or []:
        if not isinstance(step, dict):
            continue
        chunks.append(
            {
                "pageNumber": 1,
                "sectionHeading": f"Step {_clean(step.get('step_no'))}",
                "chunkText": (
                    f"{ctx}. Process step {_clean(step.get('step_no'))}: "
                    f"{_clean(step.get('action'))}. Actor: {_clean(step.get('actor'))}. "
                    f"Channel: {_clean(step.get('channel'))}."
                ),
                "chunkType": "krones_process",
            }
        )

    for rule in profile.get("thresholds_and_rules") or []:
        if not isinstance(rule, dict):
            continue
        chunks.append(
            {
                "pageNumber": 1,
                "sectionHeading": _clean(rule.get("rule_name")),
                "chunkText": f"{ctx}. Rule {_clean(rule.get('rule_name'))}: {_clean(rule.get('condition'))}.",
                "chunkType": "krones_threshold",
            }
        )

    for esg in profile.get("esg_requirements") or []:
        if not isinstance(esg, dict):
            continue
        chunks.append(
            {
                "pageNumber": 1,
                "sectionHeading": f"ESG {_clean(esg.get('pillar'))}",
                "chunkText": (
                    f"{ctx}. ESG pillar {_clean(esg.get('pillar'))} — "
                    f"{_clean(esg.get('topic'))}: {_clean(esg.get('requirement'))}."
                ),
                "chunkType": "krones_esg",
                "esgPillar": _clean(esg.get("pillar")),
            }
        )

    for pack in profile.get("packaging_rules") or []:
        if not isinstance(pack, dict):
            continue
        items = pack.get("items") or []
        chunks.append(
            {
                "pageNumber": 1,
                "sectionHeading": "Packaging",
                "chunkText": f"{ctx}. Packaging rule: {_clean(pack.get('rule'))}. Items: {', '.join(items)}.",
                "chunkType": "krones_packaging",
            }
        )

    for contact in profile.get("contacts") or []:
        if not isinstance(contact, dict):
            continue
        chunks.append(
            {
                "pageNumber": 1,
                "sectionHeading": _clean(contact.get("role")) or "Contact",
                "chunkText": (
                    f"{ctx}. Contact: {_clean(contact.get('name'))} "
                    f"{_clean(contact.get('role'))} {_clean(contact.get('email'))} "
                    f"{_clean(contact.get('phone'))} {_clean(contact.get('location'))}."
                ),
                "chunkType": "krones_contact",
                "contactTopic": _clean(contact.get("role")),
            }
        )

    logger.info("krones schema chunks: documentId=%s count=%d", document_id, len(chunks))
    return chunks


def has_usable_krones_schema(master: dict) -> bool:
    profile = (master.get("profiles") or {}).get("krones_supplier_doc") or {}
    arrays = (
        "requirements",
        "request_types",
        "process_steps",
        "referenced_standards",
        "contacts",
    )
    return sum(len(profile.get(k) or []) for k in arrays) >= 2


def extract_krones_schema_facts(master: dict, document_id: str) -> dict:
    doc = master.get("document") or {}
    profile = (master.get("profiles") or {}).get("krones_supplier_doc") or {}
    return {
        "documentId": document_id,
        "document": build_doc_context(doc),
        "requirements": profile.get("requirements") or [],
        "request_types": profile.get("request_types") or [],
        "standards": profile.get("referenced_standards") or [],
        "thresholds": profile.get("thresholds_and_rules") or [],
    }
