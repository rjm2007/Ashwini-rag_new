import React, { useState } from "react";
import { FloatingAiAssistant } from "@/components/ui/glowing-ai-chat-assistant";
import AnswerMarkdown from "@/components/chat/AnswerMarkdown";
import ClauseResultsCard from "@/components/chat/ClauseResultsCard";
import { sendDefectMessage } from "@/lib/api";
import type { Defect, DefectMessage } from "@/lib/types";
import { Bot } from "lucide-react";

export default function DefectFloatingChat({
  defect,
  onMessageSent
}: {
  defect: Defect;
  onMessageSent: () => void;
}) {
  const [messages, setMessages] = useState<DefectMessage[]>(defect.messages || []);
  const [sending, setSending] = useState(false);

  const onSend = async (content: string) => {
    if (!content.trim() || sending) return;
    setSending(true);
    
    // Optimistic UI
    setMessages(prev => [...prev, { id: `tmp-${Date.now()}`, role: "user", content }]);
    
    try {
      const res = await sendDefectMessage(defect.id, content);
      setMessages(prev => [...prev, res.data]);
      onMessageSent(); // Trigger parent refresh
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { id: `err-${Date.now()}`, role: "assistant", content: "Sorry, something went wrong. Please try again." }
      ]);
    } finally {
      setSending(false);
    }
  };

  const modelBadge = [defect.make, defect.model].filter(Boolean).join(" · ") || "Unknown Vehicle";

  return (
    <FloatingAiAssistant
      headerLabel="Defect Assistant"
      modelBadge={modelBadge}
      onSendMessage={onSend}
      disabled={sending}
      messages={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            const structured = (msg.evidenceJson || {}) as Record<string, unknown>;
            const isMultiDecision = structured.responseType === "multi_decision";

            return (
              <div key={msg.id || i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "90%",
                  background: isUser ? "var(--accent)" : "var(--bg-surface)",
                  border: isUser ? "none" : "1px solid var(--border)",
                  borderRadius: isUser ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                  padding: isUser ? "10px 14px" : 16,
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  // Text colour has to follow the bubble it sits on. This was
                  // --accent-fg for both, which is near-black: correct on the
                  // amber user bubble, invisible on the dark assistant one.
                  color: isUser ? "var(--accent-fg)" : "var(--text-secondary)",
                }}>
                  {isUser ? (
                    <div>{msg.content}</div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}>
              <Bot size={16} color="var(--accent)" />
              <div style={{ background: 'var(--bg-panel)', padding: '8px 12px', borderRadius: 12 }}>
                 <span style={{ display: "inline-flex", gap: 4 }}>
                   <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", animation: "ping 1.2s infinite" }} />
                 </span>
              </div>
            </div>
          )}
        </div>
      }
    />
  );
}
