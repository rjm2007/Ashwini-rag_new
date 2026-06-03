"use client";

import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";
import type { DocumentDetail } from "../lib/types";

const TERMINAL_STATUSES = ["processing_complete", "failed", "awaiting_certification"];

export function useDocument(docId: string) {
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDoc = useCallback(async () => {
    if (!docId) return;
    try {
      const res = await api.get<DocumentDetail>(`/documents/${docId}`);
      setDoc(res.data);
      setError(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to load document";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    setLoading(true);
    fetchDoc();
  }, [fetchDoc]);

  useEffect(() => {
    if (!docId || !doc) return;
    if (TERMINAL_STATUSES.includes(doc.processingStatus)) return;

    const interval = setInterval(fetchDoc, 3000);
    return () => clearInterval(interval);
  }, [docId, doc?.processingStatus, fetchDoc]);

  return { doc, loading, error, refresh: fetchDoc };
}
