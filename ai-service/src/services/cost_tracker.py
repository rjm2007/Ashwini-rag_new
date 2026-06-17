"""Per-call LLM/OCR/embedding cost tracking."""

from __future__ import annotations

import logging

from sqlalchemy import text

from ..database import SessionLocal
from .pricing import estimate_cost_usd

logger = logging.getLogger("cost_tracker")


def record_cost(
    *,
    stage: str,
    provider: str,
    model: str,
    document_id: str | None = None,
    session_id: str | None = None,
    input_tokens: int | None = None,
    output_tokens: int | None = None,
    units: float | None = None,
    unit_kind: str | None = None,
) -> float:
    usd = estimate_cost_usd(
        provider=provider,
        model=model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        units=units,
        unit_kind=unit_kind,
    )
    try:
        with SessionLocal() as session:
            session.execute(
                text(
                    """
                    INSERT INTO cost_events
                      (document_id, session_id, stage, provider, model,
                       input_tokens, output_tokens, units, unit_kind, usd_cost)
                    VALUES
                      (:document_id, :session_id, :stage, :provider, :model,
                       :input_tokens, :output_tokens, :units, :unit_kind, :usd_cost)
                    """
                ),
                {
                    "document_id": document_id,
                    "session_id": session_id,
                    "stage": stage,
                    "provider": provider,
                    "model": model,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "units": units,
                    "unit_kind": unit_kind,
                    "usd_cost": usd,
                },
            )
            session.commit()
    except Exception as exc:
        logger.warning("cost_events insert failed: %s", exc)
    return usd


def sum_document_cost(document_id: str) -> float:
    with SessionLocal() as session:
        row = session.execute(
            text("SELECT COALESCE(SUM(usd_cost), 0) FROM cost_events WHERE document_id = :id"),
            {"id": document_id},
        ).first()
    return float(row[0] if row else 0)


def sum_session_cost(session_id: str) -> float:
    with SessionLocal() as session:
        row = session.execute(
            text("SELECT COALESCE(SUM(usd_cost), 0) FROM cost_events WHERE session_id = :id"),
            {"id": session_id},
        ).first()
    return float(row[0] if row else 0)
