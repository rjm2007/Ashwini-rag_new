"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FloatingAiAssistant } from "@/components/ui/glowing-ai-chat-assistant";
import { createChatSession, getChatSession, sendChatMessage } from "@/lib/api";
import { getStoredSession, storeSession, clearSession } from "@/lib/chatSession";
import AnswerMarkdown from "@/components/chat/AnswerMarkdown";
import ClauseResultsCard from "@/components/chat/ClauseResultsCard";
import DecisionCard from "@/components/chat/DecisionCard";
import SourcesPanel from "@/components/chat/SourcesPanel";
import { Bot } from "lucide-react";
import type { ChatMessageItem, QueryContext, DocumentDetail } from "@/lib/types";

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--accent)",
            opacity: 0.6,
            animation: `pulse 1s ${i * 0.15}s infinite ease-in-out`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

interface DocumentFloatingChatProps {
  docId: string;
  filename: string;
  document?: DocumentDetail;
}

export default function DocumentFloatingChat({ docId, filename, document }: DocumentFloatingChatProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [sending, setSending] = useState(false);
  const [context, setContext] = useState<QueryContext>({});
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const buildContext = useCallback(
    (extra: Partial<QueryContext> = {}): QueryContext => ({
      ...context,
      ...extra,
      documentId: docId,
    }),
    [context, docId]
  );

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = getStoredSession(docId);
      if (existing) {
        try {
          const res = await getChatSession(existing);
          if (!cancelled) {
            setSessionId(existing);
            setMessages(res.data?.messages ?? []);
            return;
          }
        } catch {
          /* session gone server-side — fall through and create a new one */
        }
      }
      const res = await createChatSession(filename);
      const newId = res.data?.id ?? res.data?.sessionId;
      if (!cancelled && newId) {
        storeSession(docId, newId);
        setSessionId(newId);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [docId, filename]);

  const handleResetChat = async () => {
    clearSession(docId);
    setMessages([]);
    setSessionId(null);
    setContext({});
    const res = await createChatSession(filename);
    const newId = res.data?.id ?? res.data?.sessionId;
    if (newId) {
      storeSession(docId, newId);
      setSessionId(newId);
    }
  };

  const onSend = async (text: string) => {
    if (!sessionId || !text.trim() || sending) return;
    const ctx = buildContext();
    setContext(ctx);
    const userMsg: ChatMessageItem = { id: `tmp-${Date.now()}`, role: "user", content: text.trim() } as ChatMessageItem;
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    try {
      const res = await sendChatMessage(sessionId, text.trim(), docId, ctx);
      const assistantMsg: ChatMessageItem = res.data?.assistantMessage ?? res.data;
      const meta = (assistantMsg as any)?.metadataFiltersAppliedJson || {};
      if (meta.context && typeof meta.context === "object") {
        setContext(meta.context as QueryContext);
      }
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: "assistant", content: "Sorry, something went wrong. Please try again." } as ChatMessageItem,
      ]);
    } finally {
      setSending(false);
      setInputValue("");
    }
  };

  return (
    <FloatingAiAssistant
      headerLabel="AI Warranty Analyst"
      modelBadge={filename || "Document"}
      onSendMessage={onSend}
      disabled={!sessionId || sending}
      messages={
        <div ref={scrollRef} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleResetChat}
              style={{
                fontSize: 11,
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
                padding: "2px 8px",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Reset Chat
            </button>
          </div>

          {messages.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Ask anything about this warranty document — coverages, limits, exclusions, components.
            </p>
          )}

          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            const structured = (msg.evidenceJson || {}) as Record<string, unknown>;
            const responseType = (structured.responseType as string) || "answer";
            const evidence = (msg.evidenceJson as any) || [];

            return (
              <div key={msg.id || i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                <div
                  style={{
                    maxWidth: "90%",
                    background: isUser ? "var(--accent)" : "var(--bg-panel)",
                    border: isUser ? "none" : "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 16,
                    color: "#FFF",
                  }}
                >
                  {isUser ? (
                    <div>{msg.content}</div>
                  ) : responseType === "multi_decision" ? (
                    <ClauseResultsCard data={structured as never} />
                  ) : (
                    <div>
                      <AnswerMarkdown text={msg.content} evidence={evidence as any[]} />
                      {responseType === "decision" && (
                        <DecisionCard
                          coverageDecision={(structured.coverageDecision || structured.decision) as any}
                          explanation={structured.explanation as string}
                        />
                      )}
                      <SourcesPanel sources={evidence as any[]} answerText={msg.content} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {sending && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, alignSelf: "flex-start" }}>
              <Bot size={16} color="var(--accent)" />
              <div style={{ background: "var(--bg-panel)", padding: "8px 12px", borderRadius: 12 }}>
                <TypingDots />
              </div>
            </div>
          )}
        </div>
      }
    />
  );
}
