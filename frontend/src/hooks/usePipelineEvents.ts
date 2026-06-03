"use client";

import { useEffect, useRef, useState } from "react";
import { getDocumentEvents } from "../lib/api";
import type { PipelineEvent } from "../lib/types";

const TERMINAL_STATES_ACT1 = ["awaiting_certification", "failed"];
const TERMINAL_STATES_ACT2 = ["processing_complete", "failed"];

function normalizeEvent(raw: Record<string, unknown>): PipelineEvent {
  return {
    id: String(raw.id ?? ""),
    document_id: String(raw.document_id ?? raw.documentId ?? ""),
    act: Number(raw.act) as 1 | 2,
    stage: String(raw.stage ?? ""),
    step_key: String(raw.step_key ?? raw.stepKey ?? ""),
    step_label: String(raw.step_label ?? raw.stepLabel ?? ""),
    status: (raw.status as PipelineEvent["status"]) || "idle",
    detail: (raw.detail as Record<string, unknown>) || {},
    duration_ms: raw.duration_ms != null ? Number(raw.duration_ms) : raw.durationMs != null ? Number(raw.durationMs) : null,
    sequence: Number(raw.sequence ?? 0),
    created_at: String(raw.created_at ?? raw.createdAt ?? "")
  };
}

function act2Started(events: PipelineEvent[]): boolean {
  return events.some((e) => e.act === 2);
}

function shouldPoll(processingStatus: string, events: PipelineEvent[]): boolean {
  if (TERMINAL_STATES_ACT2.includes(processingStatus)) return false;
  if (TERMINAL_STATES_ACT1.includes(processingStatus) && !act2Started(events)) return false;
  return true;
}

export function usePipelineEvents(docId: string, processingStatus: string) {
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const eventsRef = useRef<PipelineEvent[]>([]);

  useEffect(() => {
    if (!docId) return;
    let cancelled = false;

    const fetchEvents = async () => {
      try {
        const res = await getDocumentEvents(docId);
        const normalized = (Array.isArray(res.data) ? res.data : []).map((e) =>
          normalizeEvent(e as unknown as Record<string, unknown>)
        );
        if (!cancelled) {
          eventsRef.current = normalized;
          setEvents(normalized);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };

    fetchEvents();
    const interval = setInterval(() => {
      if (!shouldPoll(processingStatus, eventsRef.current)) return;
      fetchEvents();
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [docId, processingStatus]);

  return { events, loading };
}
