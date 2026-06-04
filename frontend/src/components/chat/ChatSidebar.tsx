"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChatSession,
  getChatSession,
  sendChatMessage as sendChatMessageApi
} from "../../lib/api";
import MonoChip from "../ui/MonoChip";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import type { ChatMessageItem } from "../../lib/types";
import { inferCoverageDecision } from "./CoverageDecision";

export default function ChatSidebar({
  docId,
  filename,
  certified
}: {
  docId: string;
  filename: string;
  certified: boolean;
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!certified || !docId) return;
    const key = `chat_session_${docId}`;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        let sid = localStorage.getItem(key);
        if (!sid) {
          const res = await createChatSession(filename);
          sid = res.data.id;
          localStorage.setItem(key, sid);
        }
        if (cancelled) return;
        setSessionId(sid);
        const session = await getChatSession(sid);
        if (!cancelled) {
          setMessages((session.data.messages || []) as ChatMessageItem[]);
        }
      } catch {
        /* session setup failed */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [certified, docId, filename]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const onSend = async (content: string) => {
    if (!sessionId || !certified) return;
    const userMsg: ChatMessageItem = {
      id: `temp-${Date.now()}`,
      role: "user",
      content
    };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    try {
      const res = await sendChatMessageApi(sessionId, content, docId);
      const assistant = res.data as ChatMessageItem;
      const enriched: ChatMessageItem = {
        ...assistant,
        coverageDecision: inferCoverageDecision(
          assistant.confidenceScore ?? 0,
          assistant.metadataFiltersAppliedJson
        )
      };
      setMessages((prev) => [...prev, enriched]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Could not send message. Please try again.",
          confidenceScore: 0
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  const getPairedQuestion = (index: number): string | undefined => {
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i].role === "user") return messages[i].content;
    }
    return undefined;
  };

  return (
    <div
      style={{
        width: "40%",
        height: "100%",
        background: "var(--bg-surface)",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        minWidth: 0
      }}
    >
      <div
        style={{
          height: 48,
          padding: "10px 16px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: "var(--text-primary)" }}>
          Ask about this document
        </p>
        <div style={{ marginTop: 4 }}>
          <MonoChip value={filename.length > 40 ? `${filename.slice(0, 37)}…` : filename} size="sm" />
        </div>
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 16,
          display: "flex",
          flexDirection: "column"
        }}
      >
        {!certified ? (
          <p
            style={{
              margin: "auto",
              fontSize: 13,
              fontStyle: "italic",
              color: "var(--text-muted)",
              textAlign: "center"
            }}
          >
            Chat activates once this document is certified.
          </p>
        ) : loading ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading chat…</p>
        ) : (
          messages.map((msg, i) => (
            <ChatMessage
              key={msg.id || i}
              message={msg}
              sessionId={sessionId || undefined}
              documentId={docId}
              pairedQuestion={msg.role === "assistant" ? getPairedQuestion(i) : undefined}
            />
          ))
        )}
      </div>

      <ChatInput disabled={!certified} sending={sending} onSend={onSend} />
    </div>
  );
}
