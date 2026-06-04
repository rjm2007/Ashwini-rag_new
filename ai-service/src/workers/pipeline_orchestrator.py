"""Two-act pipeline: Act 1 on upload, Act 2 on certify."""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path

from sqlalchemy import text

from ..config import settings
from ..database import SessionLocal
from ..services.chunking_service import chunk_pages, chunk_text
from ..services.coverage_row_parser import parse_chunk_structured_meta
from ..services.docling_structure_service import check_health, parse_structured
from ..services.embedding_service import prepare_chunks_for_upsert
from ..services.event_emitter import finish_step, start_step
from ..services.ocr_service import OcrService
from ..services.qdrant_service import QdrantService
from ..services.schema_extraction_service import extract_master_schema
from ..services.section_classifier import classify_sections
from ..services.s3_service import S3Service
from ..services.strategic_chunker import parse_vin_chassis_from_text
from ..services.vehicle_fallback_service import run_vehicle_fallback

logger = logging.getLogger("pipeline")
logger.setLevel(logging.INFO)


async def _update_status(document_id: str, status: str, error: str | None = None) -> None:
    with SessionLocal() as session:
        session.execute(
            text("""
                UPDATE documents
                SET processing_status = CAST(:status AS processing_status),
                    error_message = :err,
                    updated_at = NOW()
                WHERE id = :id
            """),
            {"status": status, "err": error, "id": document_id},
        )
        session.commit()


async def run_act1_parse(document_id: str, s3_path: str | None = None) -> None:
    """ACT 1: parse → tree → classify → awaiting_certification (no embeddings)."""
    logger.info("[%s] ACT 1 START", document_id)
    s3 = S3Service()

    if not s3_path:
        with SessionLocal() as session:
            row = session.execute(
                text("SELECT s3_path FROM documents WHERE id = :id"),
                {"id": document_id},
            ).first()
            s3_path = row[0] if row else None
    if not s3_path:
        logger.error("[%s] ACT 1 ABORT: no s3_path", document_id)
        return

    try:
        step = start_step(document_id, 1, "parse", "pdf_received", "PDF received")
        finish_step(step, {"s3_path": s3_path})
        await _update_status(document_id, "parsing")

        step = start_step(document_id, 1, "parse", "docling_parse", "Parsing document (Docling)")
        structured: dict
        try:
            pdf_bytes = await s3.download_bytes(s3_path)
            if settings.parser_primary in ("docling_structured", "auto") and check_health().get("ok"):
                structured = parse_structured(pdf_bytes)
            else:
                raise RuntimeError("Docling structured parser unavailable")
            await s3.upload_json(f"processing-artifacts/{document_id}/structure.json", structured)
            finish_step(
                step,
                {
                    "pages": len(structured.get("pages_text", [])),
                    "tables": structured.get("table_count", 0),
                    "headings": len(structured.get("headings", [])),
                    "processing_time_s": round(structured.get("processing_time") or 0, 2),
                },
            )
        except Exception as exc:
            logger.warning("[%s] Docling failed, OCR fallback: %s", document_id, exc)
            ocr = OcrService()
            ocr_result = ocr.run_ocr(s3_path)
            pages = ocr_result.get("pages", [])
            plain = "\n".join(p.get("text", "") for p in pages)
            structured = {
                "pages_text": pages,
                "plain_text": plain,
                "md_content": "",
                "hierarchy": [],
                "headings": [],
                "tables": [],
                "table_count": 0,
                "page_count": len(pages),
                "processing_time": 0,
            }
            await s3.upload_json(f"processing-artifacts/{document_id}/structure.json", structured)
            finish_step(step, {"pages": len(pages), "fallback": "ocr", "error": str(exc)[:200]})

        step = start_step(document_id, 1, "structure", "document_tree", "Building document tree")
        await _update_status(document_id, "structuring")
        doc_tree = structured.get("hierarchy", [])
        with SessionLocal() as session:
            session.execute(
                text("UPDATE documents SET document_tree_json = CAST(:tree AS jsonb), updated_at = NOW() WHERE id = :id"),
                {"tree": json.dumps(doc_tree), "id": document_id},
            )
            session.commit()
        finish_step(step, {"tree_nodes": len(doc_tree)})

        step = start_step(document_id, 1, "classify", "section_classify", "Classifying sections")
        await _update_status(document_id, "classifying")
        doc_type = "generic_document"
        try:
            if settings.enable_section_classification:
                classify_result = classify_sections(
                    document_id=document_id,
                    document_tree=doc_tree,
                    headings=structured.get("headings", []),
                    tables=structured.get("tables", []),
                    md_content=structured.get("md_content", ""),
                    plain_text=structured.get("plain_text", ""),
                )
                doc_type = classify_result.get("document_type", "generic_document")
                # Persist enriched_sections into the structure artifact
                structured["enriched_sections"] = classify_result.get("enriched_sections", [])
                structured["enriched_tree"] = classify_result.get("enriched_tree", [])
                await s3.upload_json(f"processing-artifacts/{document_id}/structure.json", structured)
                finish_step(
                    step,
                    {
                        "document_type": doc_type,
                        "sections_labeled": len(classify_result.get("section_labels", [])),
                    },
                )
            else:
                finish_step(step, {"document_type": doc_type, "skipped": True})
        except Exception as exc:
            finish_step(step, {"error": str(exc)[:300]}, status="failed")

        step = start_step(document_id, 1, "classify", "type_detect", "Detecting document type")
        finish_step(step, {"document_type": doc_type})

        step = start_step(
            document_id,
            1,
            "parse",
            "vehicle_llm_fallback",
            "Recovering vehicle fields (regex + LLM)",
        )
        try:
            fallback_detail = run_vehicle_fallback(
                document_id, structured, doc_type, s3_path=s3_path
            )
            finish_step(step, fallback_detail)
        except Exception as exc:
            logger.warning("[%s] Vehicle fallback failed: %s", document_id, exc)
            finish_step(step, {"error": str(exc)[:300], "required_missing": True}, status="failed")

        await _update_status(document_id, "awaiting_certification")
        await s3.upload_json(
            f"processing-artifacts/{document_id}/act1_complete.json",
            {"document_type": doc_type, "tree_nodes": len(doc_tree)},
        )
        logger.info("[%s] ACT 1 COMPLETE → awaiting_certification", document_id)
    except Exception as exc:
        logger.exception("[%s] ACT 1 FATAL: %s", document_id, exc)
        await _update_status(document_id, "failed", error=str(exc))


async def run_act2_process(document_id: str) -> None:
    """ACT 2: schema extraction + embedding in parallel."""
    logger.info("[%s] ACT 2 START", document_id)
    await _update_status(document_id, "schema_extraction")
    s3 = S3Service()

    try:
        structure_json = await s3.download_json(f"processing-artifacts/{document_id}/structure.json")
    except Exception as exc:
        logger.error("[%s] ACT 2: cannot load Act 1 artifacts: %s", document_id, exc)
        with SessionLocal() as session:
            row = session.execute(
                text("SELECT s3_path FROM documents WHERE id = :id"),
                {"id": document_id},
            ).first()
        if not row:
            await _update_status(document_id, "failed", error="No structure artifact")
            return
        pdf_bytes = await s3.download_bytes(row[0])
        structure_json = parse_structured(pdf_bytes)

    md_content = structure_json.get("md_content", "")
    plain_text = structure_json.get("plain_text", "")
    pages_text = structure_json.get("pages_text", [])
    page_count = structure_json.get("page_count")

    with SessionLocal() as session:
        row = session.execute(
            text("SELECT document_type, s3_path, make, model, year, metadata_json FROM documents WHERE id = :id"),
            {"id": document_id},
        ).first()
    document_type = (row[0] if row else None) or "generic_document"
    s3_path = row[1] if row else ""
    
    existing_vehicle = {}
    if row:
        existing_vehicle["make"] = row[2]
        existing_vehicle["model"] = row[3]
        existing_vehicle["model_year"] = row[4]
        meta = row[5] or {}
        if isinstance(meta, dict):
            existing_vehicle["vin"] = meta.get("vin")
            existing_vehicle["chassis_id"] = meta.get("chassis_id")

    # Load sections from structure artifact for per-section extraction
    enriched_sections = structure_json.get("enriched_sections") or structure_json.get("sections", [])
    full_texts = structure_json.get("full_texts", [])

    try:
        results = await asyncio.gather(
            _run_schema_pipeline(
                document_id,
                document_type,
                md_content,
                plain_text,
                page_count,
                tables_text=structure_json.get("tables_text", ""),
                sections=enriched_sections,
                full_texts=full_texts,
                existing_vehicle=existing_vehicle,
            ),
            _run_embedding_pipeline(document_id, s3_path, pages_text, plain_text),
            return_exceptions=True,
        )

        # Check both results explicitly
        schema_err = results[0] if isinstance(results[0], Exception) else None
        embed_err = results[1] if isinstance(results[1], Exception) else None

        if schema_err and embed_err:
            logger.error("[%s] BOTH pipelines failed: schema=%s embed=%s",
                         document_id, schema_err, embed_err)
            await _update_status(document_id, "failed", error=f"schema:{schema_err}; embed:{embed_err}")
        elif schema_err:
            logger.error("[%s] Schema pipeline failed: %s — embedding completed", document_id, schema_err)
            await _update_status(document_id, "processing_complete", error=f"schema:{schema_err}")
        elif embed_err:
            logger.error("[%s] Embedding pipeline failed: %s — schema completed", document_id, embed_err)
            await _update_status(document_id, "processing_complete", error=f"embed:{embed_err}")
        else:
            await _update_status(document_id, "processing_complete")
        logger.info("[%s] ACT 2 COMPLETE", document_id)
    except Exception as exc:
        logger.exception("[%s] ACT 2 FATAL: %s", document_id, exc)
        await _update_status(document_id, "failed", error=str(exc))


async def _run_schema_pipeline(
    document_id: str,
    document_type: str,
    md_content: str,
    plain_text: str,
    page_count: int | None,
    tables_text: str = "",
    sections: list[dict] | None = None,
    full_texts: list[dict] | None = None,
    existing_vehicle: dict | None = None,
) -> None:
    from ..services.schema_extraction_service import (
        SECTION_EXTRACTION_MAP, _run_section_extraction,
        _merge_section_extracts, _normalize, _compute_quality,
        _normalize_field_wrappers_deep, _count_extracted_in,
        _clean_text, _fw_value,
    )
    from ..services.llm_service import LlmService
    from ..services.summary_generator import generate_document_summary

    if not settings.enable_schema_pipeline:
        return

    llm = LlmService()
    sections = sections or []
    full_texts = full_texts or []
    effective_md = tables_text.strip() + "\n\n" + (md_content or "") if tables_text.strip() else (md_content or "")
    effective_md = _clean_text(effective_md)

    extraction_groups = SECTION_EXTRACTION_MAP.get(
        document_type, SECTION_EXTRACTION_MAP["generic_document"]
    )

    section_extracts = []
    master = {"document": {}, "vehicle": {}, "profiles": {document_type: {}}, "extensions": []}
    if existing_vehicle:
        for k, v in existing_vehicle.items():
            if v:
                master["vehicle"][k] = {"value": v, "status": "extracted", "confidence": 1.0}

    # ── 1) PER-SECTION EXTRACTION ────────────────────────────────────────
    for group in extraction_groups:
        step_key = f"schema_{group['name']}"
        step_label = group.get("event_label", f"Extracting: {group['name']}")
        step = start_step(document_id, 2, "schema", step_key, step_label)
        try:
            extracted = _run_section_extraction(
                group, document_type, sections, effective_md, plain_text, llm,
                full_texts=full_texts,
            )
            extracted = _normalize_field_wrappers_deep(extracted)
            section_extracts.append({
                "name": group["name"],
                "labels": group["labels"],
                "extracted": extracted,
            })
            # Merge into master based on group identity
            if group["name"] in ("vehicle_identification", "vehicle_and_header"):
                _merge_section_extracts("vehicle", extracted.get("vehicle", extracted), master["vehicle"])
                _merge_section_extracts("document", extracted.get("document", {}), master["document"])
                profile = master["profiles"].setdefault(document_type, {})
                for k in ("invoice_no", "ro_no", "invoice_date", "customer", "complaint", "correction"):
                    if k in extracted:
                        profile.setdefault(k, extracted[k])
            elif group["name"] in ("coverage_summary", "coverage_codes", "line_items", "exclusions", "claim_procedure"):
                profile = master["profiles"].setdefault(document_type, {})
                profile_extracts = (extracted.get("profiles", {}) or {}).get(document_type, extracted)
                _merge_section_extracts(group["name"], profile_extracts, profile)
            elif group["name"] == "full_document":
                _merge_section_extracts("document", extracted.get("document", {}), master["document"])
                _merge_section_extracts("vehicle", extracted.get("vehicle", {}), master["vehicle"])
                for ext in extracted.get("extensions", []):
                    master["extensions"].append(ext)

            finish_step(step, {
                "name": group["name"],
                "fields_in_section": _count_extracted_in(extracted),
                "section_labels_used": group["labels"],
            })
        except Exception as exc:
            logger.warning("[%s] Section %s extraction failed: %s", document_id, group["name"], exc)
            finish_step(step, {"name": group["name"], "error": str(exc)[:300]}, status="failed")

    # ── 2) NORMALIZE + QUALITY ───────────────────────────────────────────
    step = start_step(document_id, 2, "schema", "schema_normalize", "Normalizing & validating fields")
    master = _normalize_field_wrappers_deep(master)
    master = _normalize(master)
    quality = _compute_quality(master, page_count)
    master["quality"] = quality
    finish_step(step, {
        "completeness": quality["overall_completeness"],
        "extracted": quality["fields_extracted"],
        "missing": quality["fields_missing"],
        "low_confidence": quality["fields_low_confidence"],
    })

    # ── 3) SAVE MASTER SCHEMA ────────────────────────────────────────────
    step = start_step(document_id, 2, "schema", "schema_save", "Saving master schema to database")
    vehicle = master.get("vehicle", {}) or {}
    vin_val = _fw_value(vehicle.get("vin"))
    chassis_val = _fw_value(vehicle.get("chassis_id"))
    make_val = _fw_value(vehicle.get("make"))
    model_val = _fw_value(vehicle.get("model"))
    year_val = _fw_value(vehicle.get("model_year"))
    required_missing = not all([vin_val or chassis_val, make_val, model_val])

    from sqlalchemy import text as sqla_text
    with SessionLocal() as session:
        session.execute(
            sqla_text("""
                UPDATE documents
                SET master_schema_json      = CAST(:schema AS jsonb),
                    section_extracts_json   = CAST(:extracts AS jsonb),
                    completeness            = :comp,
                    required_fields_missing = :req,
                    make                    = COALESCE(:make, make),
                    model                   = COALESCE(:model, model),
                    year                    = COALESCE(:year, year),
                    metadata_json           = COALESCE(metadata_json, '{}'::jsonb)
                                              || CAST(:meta AS jsonb),
                    updated_at              = NOW()
                WHERE id = :id
            """),
            {
                "schema": json.dumps(master),
                "extracts": json.dumps(section_extracts),
                "comp": quality["overall_completeness"],
                "req": required_missing,
                "make": make_val, "model": model_val, "year": year_val,
                "meta": json.dumps({k: v for k, v in {
                    "vin": vin_val, "chassis_id": chassis_val,
                }.items() if v}),
                "id": document_id,
            },
        )
        session.commit()
    finish_step(step, {
        "extracted": quality["fields_extracted"],
        "missing": quality["fields_missing"],
        "required_missing": required_missing,
    })

    # ── 4) AI NARRATIVE SUMMARY ──────────────────────────────────────────
    step = start_step(document_id, 2, "schema", "summary_generate", "Generating AI summary")
    try:
        summary_text = generate_document_summary(document_id, master)
        finish_step(step, {"summary_chars": len(summary_text)})
    except Exception as exc:
        logger.warning("[%s] Summary generation failed: %s", document_id, exc)
        finish_step(step, {"error": str(exc)[:200]}, status="failed")


async def _run_embedding_pipeline(
    document_id: str,
    s3_path: str,
    pages_text: list,
    plain_text: str,
) -> None:
    with SessionLocal() as session:
        row = session.execute(
            text(
                "SELECT make, model, year, warranty_type, country, metadata_json "
                "FROM documents WHERE id = :id"
            ),
            {"id": document_id},
        ).first()
    metadata: dict = {}
    if row:
        metadata = {
            "make": row[0],
            "model": row[1],
            "year": row[2],
            "warrantyType": row[3],
            "country": row[4],
        }
        raw_meta = row[5] or {}
        if isinstance(raw_meta, dict):
            if raw_meta.get("vin"):
                metadata["vin"] = raw_meta["vin"]
            if raw_meta.get("chassis_id"):
                metadata["chassisId"] = raw_meta["chassis_id"]

    if not metadata.get("vin") and plain_text:
        parsed = parse_vin_chassis_from_text(plain_text)
        if parsed.get("vin"):
            metadata["vin"] = parsed["vin"]
        if parsed.get("chassis_id"):
            metadata["chassisId"] = parsed["chassis_id"]

    step = start_step(document_id, 2, "embedding", "chunk_generate", "Generating chunks")
    try:
        chunks = chunk_pages(pages_text, document_id=document_id) if pages_text else chunk_text(plain_text)
        finish_step(step, {"chunk_count": len(chunks)})
    except Exception as exc:
        finish_step(step, {"error": str(exc)[:300]}, status="failed")
        raise

    step = start_step(document_id, 2, "embedding", "metadata_enrich", "Enriching metadata")
    qdrant = QdrantService()
    filename = Path(s3_path).name if s3_path else f"{document_id}.pdf"
    chunks = prepare_chunks_for_upsert(
        chunks,
        plain_text,
        enable_contextual=settings.enable_contextual_retrieval,
        enable_sparse=qdrant.hybrid,
    )
    enriched = []
    for chunk in chunks:
        item = dict(chunk)
        if not item.get("structuredMeta"):
            item["structuredMeta"] = parse_chunk_structured_meta(item)
        item["repository"] = "certified"
        item["documentId"] = document_id
        item["filename"] = filename
        item.update(
            {
                "make": metadata.get("make"),
                "model": metadata.get("model"),
                "year": metadata.get("year"),
                "country": metadata.get("country"),
                "warrantyType": metadata.get("warrantyType"),
                "vin": metadata.get("vin"),
                "chassisId": metadata.get("chassisId"),
            }
        )
        enriched.append(item)
    finish_step(step, {"enriched": len(enriched)})

    step = start_step(document_id, 2, "embedding", "embed_generate", "Creating embeddings (OpenAI)")
    finish_step(step, {"chunks": len(enriched), "model": settings.small_model})

    step = start_step(document_id, 2, "embedding", "qdrant_index", "Indexing (Qdrant)")
    try:
        qdrant.upsert_chunks(document_id, enriched)
        finish_step(step, {"upserted": len(enriched), "collection": settings.qdrant_collection})
    except Exception as exc:
        finish_step(step, {"error": str(exc)[:300]}, status="failed")
        raise


async def process_document(document_id: str, s3_path: str | None = None) -> None:
    """Legacy entry point → Act 1 only when gate_heavy_on_certify is enabled."""
    if settings.gate_heavy_on_certify:
        await run_act1_parse(document_id, s3_path)
    else:
        await _legacy_process_document(document_id, s3_path)


async def _legacy_process_document(document_id: str, s3_path: str | None = None) -> None:
    """Full single-pass pipeline (pre-plan behavior) when gate is disabled."""
    from ..services.extraction_service import ExtractionService

    s3 = S3Service()
    ocr = OcrService()
    extractor = ExtractionService()
    qdrant = QdrantService()

    if not s3_path:
        with SessionLocal() as session:
            row = session.execute(text("SELECT s3_path FROM documents WHERE id = :id"), {"id": document_id}).first()
            if not row:
                return
            s3_path = row[0]

    try:
        await _update_status(document_id, "ocr_in_progress")
        ocr_result = ocr.run_ocr(s3_path)
        plain_text = "\n".join(item["text"] for item in ocr_result.get("pages", []))
        metadata = extractor.extract_metadata(plain_text)
        ocr_pages = ocr_result.get("pages", [])
        chunks = chunk_pages(ocr_pages, document_id=document_id) if ocr_pages else chunk_text(plain_text)
        chunks = prepare_chunks_for_upsert(chunks, plain_text, enable_contextual=settings.enable_contextual_retrieval, enable_sparse=qdrant.hybrid)
        enriched = []
        for chunk in chunks:
            item = dict(chunk)
            item["repository"] = "pending_review"
            item["documentId"] = document_id
            enriched.append(item)
        qdrant.upsert_chunks(document_id, enriched)
        new_s3_path = f"pending-review/{document_id}/original.pdf"
        await s3.move_object(s3_path, new_s3_path)
        with SessionLocal() as session:
            session.execute(
                text(
                    "UPDATE documents SET s3_path = :s3_path, processing_status = 'ready_for_review', "
                    "current_repository = 'pending_review', updated_at = NOW() WHERE id = :id"
                ),
                {"s3_path": new_s3_path, "id": document_id},
            )
            session.commit()
    except Exception as error:
        await _update_status(document_id, "failed", error=str(error))
