"use client";

import { useEffect, useState } from "react";
import api from "../lib/api";

export function useChat(sessionId: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // This function loads messages whenever session id changes.
    if (!sessionId || sessionId === "new") {
      return;
    }
    setLoadingHistory(true);
    api
      .get(`/query/sessions/${sessionId}`)
      .then((response) => setMessages(response.data.messages || []))
      .finally(() => setLoadingHistory(false));
  }, [sessionId]);

  const sendMessage = async (content: string) => {
    // This function sends question and appends assistant response.
    setSending(true);
    try {
      const response = await api.post(`/query/sessions/${sessionId}/messages`, { content });
      setMessages((prev) => [...prev, { role: "user", content }, response.data]);
    } finally {
      setSending(false);
    }
  };

  return { messages, sendMessage, loadingHistory, sending };
}
