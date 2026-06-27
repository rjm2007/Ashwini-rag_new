"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { getDefect, sendDefectMessage } from "@/lib/api";
import type { Defect, DefectMessage } from "@/lib/types";
import Topbar from "@/components/Topbar";
import { Send, ArrowLeft } from "lucide-react";
import Link from "next/link";
import AnswerMarkdown from "@/components/chat/AnswerMarkdown";

export default function DefectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [defect, setDefect] = useState<Defect | null>(null);
  const [messages, setMessages] = useState<DefectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchDefect() {
      try {
        const res = await getDefect(id);
        const data = res.data;
        setDefect(data);
        
        if ((data as any).messages) {
          setMessages((data as any).messages);
        } else {
          setMessages([
            {
              id: "msg-1",
              role: "assistant",
              content: `Defect reported: **${data.reportedDefect}**. I have analyzed the warranty details for Document ID \`${data.documentId}\`. How can I help you resolve this?`,
            }
          ]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDefect();
  }, [id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userMsg: DefectMessage = { role: "user", content: input, id: Date.now().toString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await sendDefectMessage(id, userMsg.content);
      const reply = res.data?.reply || res.data;
      if (reply && reply.content) {
        setMessages((prev) => [...prev, reply]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, failed to send message.", id: Date.now().toString() }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>
      <Topbar breadcrumbOverride="Defect Details" />
      
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "16px" }}>
        <Link href="/defects" style={{ color: "var(--text-secondary)", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px", fontSize: "14px" }}>
          <ArrowLeft size={16} /> Back to Defects
        </Link>
        {defect && (
          <div style={{ display: "flex", gap: "16px", color: "var(--text-secondary)", fontSize: "14px", borderLeft: "1px solid var(--border)", paddingLeft: "16px" }}>
            <span style={{ color: "#FFF", fontWeight: 500 }}>ID: {defect.id.substring(0, 8)}</span>
            <span>Doc: {defect.documentId.substring(0, 8)}</span>
            <span>Vehicle: {[defect.make, defect.model, defect.year].filter(Boolean).join(" ") || "Unknown"}</span>
          </div>
        )}
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
        {loading ? (
          <div style={{ color: "var(--text-secondary)", textAlign: "center", marginTop: "40px" }}>Loading thread...</div>
        ) : (
          messages.map((m, i) => {
            const isUser = m.role === "user";
            return (
              <div key={m.id || i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "70%",
                  padding: "16px",
                  borderRadius: "12px",
                  background: isUser ? "var(--accent)" : "var(--bg-panel)",
                  color: "#FFF",
                  lineHeight: 1.5,
                  border: isUser ? "none" : "1px solid var(--border)"
                }}>
                  {isUser ? (
                    <div style={{ whiteSpace: "pre-wrap", fontSize: "14px" }}>{m.content}</div>
                  ) : (
                    <div style={{ fontSize: "14px" }}>
                      <AnswerMarkdown content={m.content} />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ padding: "16px 24px", background: "var(--bg-panel)", borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: "12px", maxWidth: "800px", margin: "0 auto" }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Discuss this defect..."
            style={{
              flex: 1,
              background: "rgba(0,0,0,0.2)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "12px 16px",
              color: "#FFF",
              outline: "none",
              fontSize: "14px"
            }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            style={{
              background: "var(--accent)",
              border: "none",
              borderRadius: "8px",
              width: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: (sending || !input.trim()) ? "not-allowed" : "pointer",
              opacity: (sending || !input.trim()) ? 0.5 : 1,
            }}
          >
            <Send size={18} color="#FFF" />
          </button>
        </div>
      </div>
    </div>
  );
}
