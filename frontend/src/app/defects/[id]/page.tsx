"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, SendHorizontal } from "lucide-react";
import { getDefect, sendDefectMessage } from "@/lib/api";
import type { Defect, DefectMessage } from "@/lib/types";
import Topbar from "@/components/Topbar";
import AnswerMarkdown from "@/components/chat/AnswerMarkdown";
import ClauseResultsCard, { decisionBadge } from "@/components/chat/ClauseResultsCard";

function MessageBubble({ msg }: { msg: DefectMessage }) {
  const isUser = msg.role === "user";
  const structured = (msg.evidenceJson || {}) as Record<string, unknown>;
  const isMultiDecision = structured.responseType === "multi_decision";

  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: "75%",
          padding: "16px",
          borderRadius: "12px",
          background: isUser ? "var(--accent)" : "var(--bg-panel)",
          color: "#FFF",
          lineHeight: 1.5,
          border: isUser ? "none" : "1px solid var(--border)"
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
}

export default function DefectThreadPage() {
  const params = useParams<{ id: string }>();
  const [defect, setDefect] = useState<Defect | null>(null);
  const [messages, setMessages] = useState<DefectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const refresh = async () => {
    try {
      const res = await getDefect(params.id);
      setDefect(res.data);
      setMessages(res.data.messages || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const onSend = async () => {
    const content = inputValue.trim();
    if (!content || sending) return;
    setInputValue("");
    setSending(true);
    setMessages((prev) => [...prev, { id: `tmp-${Date.now()}`, role: "user", content }]);
    try {
      const res = await sendDefectMessage(params.id, content);
      setMessages((prev) => [...prev, res.data]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: "assistant", content: "Sorry, something went wrong. Please try again." }
      ]);
    } finally {
      setSending(false);
    }
  };

  const badge = decisionBadge(defect?.primaryDecision);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>
      <Topbar breadcrumbOverride="Defect Details" />

      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link href="/defects" style={{ color: "var(--text-secondary)", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px", fontSize: "14px" }}>
            <ArrowLeft size={16} /> Back to Defects
          </Link>
          {defect && (
            <div style={{ display: "flex", gap: "16px", color: "var(--text-secondary)", fontSize: "14px", borderLeft: "1px solid var(--border)", paddingLeft: "16px" }}>
              <span style={{ color: "#FFF", fontWeight: 500 }}>
                {[defect.make, defect.model, defect.year].filter(Boolean).join(" ") || "Unknown vehicle"}
              </span>
              <span>{defect.reportedDefect}</span>
            </div>
          )}
        </div>
        {defect && (
          <span style={{ fontSize: 12, fontWeight: 600, color: badge.color, padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,0.06)" }}>
            {badge.label}
          </span>
        )}
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
        {loading ? (
          <div style={{ color: "var(--text-secondary)", textAlign: "center", marginTop: "40px" }}>Loading thread...</div>
        ) : (
          messages.map((m, i) => <MessageBubble key={m.id || i} msg={m} />)
        )}
      </div>

      <div style={{ padding: 16, borderTop: "1px solid var(--border)", display: "flex", gap: 10 }}>
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={1}
          placeholder="Ask a follow-up about this defect…"
          style={{
            flex: 1, padding: "10px 14px", fontSize: 13, resize: "none",
            background: "var(--bg-panel)", color: "#FFF", border: "1px solid var(--border)", borderRadius: 8
          }}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={sending || !inputValue.trim()}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40,
            background: "var(--accent)", border: "none", borderRadius: 8, color: "white",
            cursor: sending || !inputValue.trim() ? "not-allowed" : "pointer",
            opacity: sending || !inputValue.trim() ? 0.4 : 1
          }}
        >
          <SendHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}
