import asyncio
import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from ..database import SessionLocal
from ..query.query_orchestrator import answer_question
from ..services.qdrant_service import QdrantService
from ..workers.pipeline_orchestrator import run_act1_parse, run_act2_process

logger = logging.getLogger(__name__)

router = APIRouter()


class QueryRequest(BaseModel):
    question: str
    conversationHistory: list[dict[str, Any]] = []


class SetRepositoryRequest(BaseModel):
    repository: str


ALLOWED_REPOSITORIES = {"pending_review", "reviewer_approved", "certified", "rejected"}


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/internal/parse/{document_id}")
async def trigger_parse(document_id: str) -> dict:
    asyncio.create_task(run_act1_parse(document_id))
    return {"status": "started", "act": 1, "documentId": document_id}


@router.post("/internal/process/{document_id}")
async def trigger_process(document_id: str) -> dict:
    asyncio.create_task(run_act2_process(document_id))
    return {"status": "started", "act": 2, "documentId": document_id}


@router.get("/internal/summary/{document_id}")
async def get_summary(document_id: str) -> dict:
    """Return master_schema_json for SummaryView (document/vehicle/profiles/quality)."""
    with SessionLocal() as session:
        row = session.execute(
            text("SELECT master_schema_json, original_filename FROM documents WHERE id = :id"),
            {"id": document_id},
        ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")
    schema = row[0] if isinstance(row[0], dict) else {}
    filename = row[1] or ""
    if not schema:
        return {
            "document": {},
            "vehicle": {},
            "profiles": {},
            "extensions": [],
            "quality": {},
            "document_id": document_id,
            "filename": filename,
        }
    return {**schema, "document_id": document_id, "filename": filename}


@router.post("/query/answer")
async def query_answer(payload: QueryRequest) -> dict[str, Any]:
    return await answer_question(payload.question, payload.conversationHistory)


@router.post("/internal/set-repository/{document_id}")
async def set_repository(document_id: str, payload: SetRepositoryRequest) -> dict[str, Any]:
    if payload.repository not in ALLOWED_REPOSITORIES:
        raise HTTPException(
            status_code=400,
            detail=f"repository must be one of {sorted(ALLOWED_REPOSITORIES)}",
        )
    try:
        qdrant = QdrantService()
        updated = qdrant.update_repository(document_id, payload.repository)
        if updated == 0:
            raise HTTPException(
                status_code=404,
                detail=f"No chunks found in Qdrant for document {document_id}.",
            )
        return {
            "success": True,
            "documentId": document_id,
            "repository": payload.repository,
            "updatedChunks": updated,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/internal/update-chunks")
async def update_chunks(payload: dict[str, Any]) -> dict[str, Any]:
    return {"status": "not_implemented", "payload": payload}
