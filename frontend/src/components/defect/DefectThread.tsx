"use client";

import React, { useEffect, useRef, useState } from "react";
import { Bot, Send, Loader2, MessageSquare } from "lucide-react";
import AnswerMarkdown from "@/components/chat/AnswerMarkdown";
import ClauseResultsCard from "@/components/chat/ClauseResultsCard";
import { sendDefectMessage } from "@/lib/api";
import type { Defect, DefectMessage } from "@/lib/types";

/**
 * The defect conversation, rendered as the page rather than inside a floating
 * bubble.
 *
 * The previous /defects/[id] screen was an empty panel reading "Defect Analysis
 * Complete — click the floating button in the bottom right", which hid the only
 * content the route has behind a 56px circle. The thread IS the page.
 */
export default function DefectThread({
  defect,
  onMessageSent,
}: {
  defect: Defect;
  onMessageSent: () => void;
}) {
  const [messages, setMessages] = useState<DefectMessage[]>(defect.messages || []);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Scroll the conversation pane only. `scrollIntoView` walks up and scrolls
  // every scrollable ancestor, which dragged the page header and the decision
  // rail off-screen as soon as the thread loaded.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, sending]);

  const send = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setDraft("");
    setSending(true);
    setMessages((prev) => [...prev, { id: `tmp-${Date.now()}`, role: "user", content }]);
    try {
      const res = await sendDefectMessage(defect.id, content);
      setMessages((prev) => [...prev, res.data]);
      onMessageSent();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Sorry — that didn't go through. Check the connection and try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, overflow: "hidden" }}>
      {/* Conversation */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "22px 26px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {messages.length === 0 && !sending && (
          <div
            style={{
              margin: "auto",
              textAlign: "center",
              maxWidth: "42ch",
              color: "var(--text-muted)",
            }}
          >
            <MessageSquare size={38} style={{ opacity: 0.45, marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 650, color: "var(--text-primary)", marginBottom: 6 }}>
              No discussion yet
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              Ask why this decision was reached, what the clause actually says, or what would change it.
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          const structured = (msg.evidenceJson || {}) as Record<string, unknown>;
          const isMultiDecision = structured.responseType === "multi_decision";

          return (
            <div
              key={msg.id || i}
              style={{ display: "flex", gap: 12, justifyContent: isUser ? "flex-end" : "flex-start" }}
            >
              {!isUser && (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    flexShrink: 0,
                    background: "var(--accent)",
                    color: "var(--accent-fg)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Bot size={15} />
                </div>
              )}

              <div
                style={{
                  maxWidth: isUser ? "72%" : "80%",
                  background: isUser ? "var(--accent)" : "var(--bg-surface)",
                  border: isUser ? "none" : "1px solid var(--border)",
                  borderRadius: isUser ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                  padding: isUser ? "10px 14px" : "14px 16px",
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  // Follows the bubble it sits on — near-black on amber,
                  // secondary ink on the dark surface.
                  color: isUser ? "var(--accent-fg)" : "var(--text-secondary)",
                }}
              >
                {isUser ? (
                  msg.content
                ) : isMultiDecision ? (
                  <ClauseResultsCard data={structured as never} />
                ) : (
                  <AnswerMarkdown text={msg.content} />
                )}
              </div>
            </div>
          );
        })}

        {sending && (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "var(--accent)",
                color: "var(--accent-fg)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Bot size={15} />
            </div>
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px 12px 12px 4px",
                padding: "12px 16px",
                display: "flex",
                gap: 5,
              }}
            >
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className="animate-breathe"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    animationDelay: `${d * 0.18}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Composer */}
      <div
        style={{
          flexShrink: 0,
          borderTop: "1px solid var(--border)",
          background: "var(--bg-surface)",
          padding: "13px 26px 17px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 10,
            background: "var(--bg-sunk)",
            border: "1px solid var(--border-strong)",
            borderRadius: 12,
            padding: "9px 11px",
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            disabled={sending}
            placeholder="Ask about this decision, the clause it used, or what would change it…"
            style={{
              flex: 1,
              resize: "none",
              border: "none",
              outline: "none",
              background: "transparent",
              color: "var(--text-primary)",
              fontSize: 13.5,
              lineHeight: 1.5,
              fontFamily: "inherit",
              maxHeight: 120,
              padding: "4px 2px",
            }}
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || !draft.trim()}
            aria-label="Send message"
            style={{
              width: 32,
              height: 32,
              flexShrink: 0,
              borderRadius: 9,
              border: "none",
              background: "var(--accent)",
              color: "var(--accent-fg)",
              display: "grid",
              placeItems: "center",
              cursor: sending || !draft.trim() ? "not-allowed" : "pointer",
              opacity: sending || !draft.trim() ? 0.5 : 1,
            }}
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
        <div
          className="mono"
          style={{ marginTop: 8, fontSize: 10.5, color: "var(--text-muted)", display: "flex", gap: 12 }}
        >
          <span>Enter to send · Shift + Enter for a new line</span>
          <span style={{ marginLeft: "auto" }}>Answers cite the clause they came from</span>
        </div>
      </div>
    </div>
  );
}
