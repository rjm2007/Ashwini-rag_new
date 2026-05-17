import json
import logging
from sqlalchemy import text
from ..database import SessionLocal
from ..services.s3_service import S3Service
from ..services.textract_service import TextractService
from ..services.extraction_service import ExtractionService
from ..services.chunking_service import chunk_text
from ..services.embedding_service import embed_chunks
from ..services.qdrant_service import QdrantService

logger = logging.getLogger("pipeline")
logger.setLevel(logging.INFO)


async def update_document_status(document_id: str, status: str, repository: str | None = None) -> None:
    """This function updates processing status and optional repository in Postgres."""
    with SessionLocal() as session:
        if repository:
            session.execute(
                text(
                    "UPDATE documents SET processing_status = :status, current_repository = :repository, updated_at = NOW() WHERE id = :id"
                ),
                {"status": status, "repository": repository, "id": document_id},
            )
        else:
            session.execute(
                text("UPDATE documents SET processing_status = :status, updated_at = NOW() WHERE id = :id"),
                {"status": status, "id": document_id},
            )
        session.commit()


async def process_document(document_id: str, s3_path: str | None = None) -> None:
    """This function runs OCR, extraction, chunking, embedding, and vector upsert."""
    s3 = S3Service()
    textract = TextractService()
    extractor = ExtractionService()
    qdrant = QdrantService()

    if not s3_path:
        with SessionLocal() as session:
            row = session.execute(text("SELECT s3_path FROM documents WHERE id = :id"), {"id": document_id}).first()
            if not row:
                return
            s3_path = row[0]

    try:
        logger.info("[%s] STEP 1/6 OCR start (s3=%s)", document_id, s3_path)
        await update_document_status(document_id, "ocr_in_progress")
        ocr_result = textract.run_ocr(s3_path)
        page_count = len(ocr_result.get("pages", []))
        await s3.upload_json(f"ocr-output/{document_id}/ocr.json", ocr_result)
        logger.info("[%s] STEP 1/6 OCR done (pages=%d)", document_id, page_count)

        logger.info("[%s] STEP 2/6 Metadata extraction start", document_id)
        await update_document_status(document_id, "extraction_in_progress")
        plain_text = "\n".join([item["text"] for item in ocr_result.get("pages", [])])
        metadata = extractor.extract_metadata(plain_text)
        await s3.upload_json(f"extracted-text/{document_id}/text.json", {"text": plain_text})
        await s3.upload_json(f"processing-artifacts/{document_id}/metadata.json", metadata)
        logger.info(
            "[%s] STEP 2/6 Metadata extracted (make=%s model=%s year=%s text_chars=%d)",
            document_id,
            metadata.get("make"),
            metadata.get("model"),
            metadata.get("year"),
            len(plain_text),
        )

        with SessionLocal() as session:
            session.execute(
                text(
                    """
                    UPDATE documents
                    SET make = :make, model = :model, year = :year, warranty_type = :warranty_type,
                        country = :country, metadata_json = CAST(:metadata AS jsonb), processing_status = 'extraction_complete',
                        updated_at = NOW()
                    WHERE id = :id
                    """
                ),
                {
                    "id": document_id,
                    "make": metadata.get("make"),
                    "model": metadata.get("model"),
                    "year": metadata.get("year"),
                    "warranty_type": metadata.get("warranty_type"),
                    "country": metadata.get("country"),
                    "metadata": json.dumps(metadata),
                },
            )
            session.commit()

        logger.info("[%s] STEP 3/6 DB metadata update done", document_id)

        logger.info("[%s] STEP 4/6 Chunking start", document_id)
        chunks = chunk_text(plain_text)
        logger.info("[%s] STEP 4/6 Chunked into %d pieces", document_id, len(chunks))

        logger.info("[%s] STEP 5/6 Embedding %d chunks", document_id, len(chunks))
        vectors = embed_chunks([chunk["chunkText"] for chunk in chunks])
        logger.info("[%s] STEP 5/6 Embedded %d vectors", document_id, len(vectors))
        enriched = []
        for index, chunk in enumerate(chunks):
            item = dict(chunk)
            item["vector"] = vectors[index] if index < len(vectors) else []
            item["repository"] = "pending_review"
            item["documentId"] = document_id
            item.update(
                {
                    "make": metadata.get("make"),
                    "model": metadata.get("model"),
                    "year": metadata.get("year"),
                    "country": metadata.get("country"),
                    "warrantyType": metadata.get("warranty_type"),
                }
            )
            enriched.append(item)

        qdrant.upsert_chunks(document_id, enriched)
        logger.info("[%s] STEP 6/6 Upserted %d chunks into Qdrant", document_id, len(enriched))
        new_s3_path = f"pending-review/{document_id}/original.pdf"
        await s3.move_object(s3_path, new_s3_path)
        logger.info("[%s] S3 moved to %s", document_id, new_s3_path)
        with SessionLocal() as session:
            session.execute(
                text(
                    "UPDATE documents SET s3_path = :s3_path, processing_status = 'ready_for_review', "
                    "current_repository = 'pending_review', updated_at = NOW() WHERE id = :id"
                ),
                {"s3_path": new_s3_path, "id": document_id},
            )
            session.commit()
        logger.info("[%s] DONE pipeline complete -> ready_for_review (s3_path=%s)", document_id, new_s3_path)
    except Exception as error:  # pylint: disable=broad-except
        logger.exception("[%s] FAILED pipeline error: %s", document_id, error)
        with SessionLocal() as session:
            session.execute(
                text(
                    "UPDATE documents SET processing_status = 'failed', error_message = :error, updated_at = NOW() WHERE id = :id"
                ),
                {"id": document_id, "error": str(error)},
            )
            session.commit()
