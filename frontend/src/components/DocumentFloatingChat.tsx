"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, SendHorizontal, Bot } from "lucide-react";
import { createChatSession, getChatSession, sendChatMessage } from "@/lib/api";
import { getStoredSession, storeSession, clearSession } from "@/lib/chatSession";
import { inferCoverageDecision } from "@/components/chat/CoverageDecision";
import CoverageDecisionTag from "@/components/chat/CoverageDecision";
import ConfidenceBand from "@/components/chat/ConfidenceBand";
import SourcesPanel from "@/components/chat/SourcesPanel";
import AnswerMarkdown from "@/components/chat/AnswerMarkdown";
import type { ChatMessageItem, EvidencePayload, QueryContext, CoverageDecision, CoverageListItem, DocumentDetail, MultiDecisionResponse } from "@/lib/types";
import ClauseResultsCard, { decisionBadge } from "@/components/chat/ClauseResultsCard";
import DisambiguationCard from "@/components/chat/DisambiguationCard";

import DecisionCard, { type DecisionCardProps } from "@/components/chat/DecisionCard";
import CoverageListCard from "@/components/chat/CoverageListCard";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const EASE_PRIMARY: [number, number, number, number] = [0.16, 1, 0.3, 1];

const SUGGESTED_QUESTIONS = [
  "What does this warranty cover?",
  "Are there any exclusions?",
  "What is the coverage period?",
];

/* ------------------------------------------------------------------ */
/*  Typing indicator (3 breathing dots)                                */
/* ------------------------------------------------------------------ */

function TypingDots() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut",
          }}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--accent)",
            display: "inline-block",
          }}
        />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  MonoChip                                                            */
/* ------------------------------------------------------------------ */

function MonoChip({ text }: { text: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        fontFamily: "'IBM Plex Mono', monospace",
        padding: "2px 8px",
        borderRadius: "var(--r-sm)",
        background: "var(--bg-hover)",
        color: "var(--text-muted)",
        maxWidth: 200,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Suggested chip buttons                                              */
/* ------------------------------------------------------------------ */

function SuggestionChips({
  suggestions,
  onSelect,
}: {
  suggestions: string[];
  onSelect: (text: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSelect(s)}
          style={{
            border: "1px solid var(--border)",
            background: "var(--bg-surface)",
            color: "var(--accent)",
            padding: "4px 12px",
            borderRadius: "var(--r-pill)",
            fontSize: 12,
            cursor: "pointer",
            transition: "background 150ms ease, border-color 150ms ease",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.background = "var(--accent-soft)";
            (e.target as HTMLButtonElement).style.borderColor = "var(--border-accent)";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.background = "var(--bg-surface)";
            (e.target as HTMLButtonElement).style.borderColor = "var(--border)";
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function lastAssistantResponseType(messages: ChatMessageItem[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;
    const structured = !Array.isArray(msg.evidenceJson)
      ? (msg.evidenceJson as Record<string, unknown> | undefined)
      : undefined;
    return msg.responseType || (structured?.responseType as string | undefined);
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */

interface AiAnalystPanelProps {
  docId: string;
  filename: string;
  document?: DocumentDetail;
}

import { FloatingAiAssistant } from "@/components/ui/glowing-ai-chat-assistant";

export default function DocumentFloatingChat({ docId, filename, document }: AiAnalystPanelProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [context, setContext] = useState<QueryContext>({});
  const [purchaseDate, setPurchaseDate] = useState<string>(document?.assetPurchaseDate || "");
  const [currentMileage, setCurrentMileage] = useState<string>(
    document?.assetCurrentMileage != null ? String(document.assetCurrentMileage) : ""
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  /* ---------- eligibility + running flow context (backend FIX 2 pairing) ---------- */
  const eligibilityFromInputs = useCallback(() => {
    const e: { purchase_date?: string; current_mileage?: string } = {};
    if (purchaseDate) e.purchase_date = purchaseDate;
    if (currentMileage) e.current_mileage = currentMileage;
    return e;
  }, [purchaseDate, currentMileage]);

  const buildContext = useCallback(
    (extra: Partial<QueryContext> = {}): QueryContext => ({
      ...context,
      ...extra,
      documentId: docId,
      eligibility: {
        ...(context.eligibility || {}),
        ...eligibilityFromInputs(),
        ...(extra.eligibility || {}),
      },
    }),
    [context, docId, eligibilityFromInputs],
  );

  /* ---------- scroll to bottom whenever messages change ---------- */
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  /* ---------- init / restore session ---------- */
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      try {
        const existing = getStoredSession(docId);

        if (existing) {
          // Try to restore the existing session
          try {
            const res = await getChatSession(existing);
            if (!cancelled) {
              setSessionId(existing);
              const history: ChatMessageItem[] = res.data?.messages ?? [];
              setMessages(history);
              setLoading(false);
              return;
            }
          } catch {
            // Session doesn't exist on server anymore — create a new one
          }
        }

        // Create a new session
        const res = await createChatSession(filename);
        const newId: string = res.data?.id ?? res.data?.sessionId;
        if (!cancelled && newId) {
          storeSession(docId, newId);
          setSessionId(newId);
          setMessages([]);
        }
      } catch (err) {
        console.error("Failed to initialise chat session:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [docId, filename]);

  const handleResetChat = async () => {
    if (sending) return;
    clearSession(docId);
    setMessages([]);
    setSessionId(null);
    setContext({});
    setLoading(true);
    try {
      const res = await createChatSession(filename);
      const newId: string = res.data?.id ?? res.data?.sessionId;
      if (newId) {
        storeSession(docId, newId);
        setSessionId(newId);
      }
    } catch (err) {
      console.error("Failed to reset chat session:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- send a message ---------- */
  const handleSend = useCallback(
    async (text: string, contextOverride?: QueryContext) => {
      if (!sessionId || !text.trim() || sending) return;
      const content = text.trim();
      const activeContext = contextOverride ?? context;

      const userMsg: ChatMessageItem = {
        id: `tmp-${Date.now()}`,
        role: "user",
        content,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputValue("");
      setSending(true);

      try {
        const res = await sendChatMessage(sessionId, content, docId, activeContext);
        const assistantMsg: ChatMessageItem = res.data?.assistantMessage ?? res.data;
        const meta = assistantMsg.metadataFiltersAppliedJson || {};
        if (meta.context && typeof meta.context === "object") {
          setContext(meta.context as QueryContext);
        }
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        console.error("Send failed:", err);
        const errorMsg: ChatMessageItem = {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setSending(false);
      }
    },
    [sessionId, sending, docId, context],
  );

  /* ---------- free-text / starter send through the running flow context ---------- */
  const onSend = useCallback(
    (text: string) => {
      const ctx = buildContext();
      setContext(ctx);
      handleSend(text, ctx);
    },
    [buildContext, handleSend],
  );

  /* ---------- reset the pin after a decision (keep eligibility) ---------- */
  const latestResponseType =
    lastAssistantResponseType(messages);
  useEffect(() => {
    if (latestResponseType === "decision") {
      setContext((c) => ({ ...c, selectedCoverageId: undefined }));
    }
  }, [latestResponseType]);

  /* ---------- keyboard handler ---------- */
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend(inputValue);
    }
  };

  /* ---------- auto-resize textarea ---------- */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const target = e.target;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 96)}px`;
  };

  /* ---------- check if latest message is from assistant ---------- */
  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
  const showSuggestions = lastMsg?.role === "assistant" && !sending;

  /* ---------- render ---------- */

  return (
    <FloatingAiAssistant
      headerLabel="AI Warranty Analyst"
      modelBadge={filename || "Document"}
      onSendMessage={onSend}
      disabled={!sessionId || sending}
      messages={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Eligibility & Settings */}
          <div style={{ background: 'var(--bg-panel)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Analysis Context</span>
              <button
                onClick={handleResetChat}
                style={{
                  fontSize: 11,
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  padding: '2px 8px',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                Reset Chat
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Purchase Date</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    padding: '4px 8px',
                    fontSize: 12,
                    color: '#FFF'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Current Mileage</label>
                <input
                  type="number"
                  value={currentMileage}
                  onChange={(e) => setCurrentMileage(e.target.value)}
                  placeholder="e.g. 15000"
                  style={{
                    width: '100%',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    padding: '4px 8px',
                    fontSize: 12,
                    color: '#FFF'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Messages */}
          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            const structured = (msg.evidenceJson || {}) as Record<string, unknown>;
            const responseType = structured.responseType || "answer";
            const evidence = msg.evidenceJson || [];
            
            return (
              <div key={msg.id || i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "90%",
                  background: isUser ? "var(--accent)" : "var(--bg-panel)",
                  border: isUser ? "none" : "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 16,
                  color: "#FFF"
                }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}>
              <Bot size={16} color="var(--accent)" />
              <div style={{ background: 'var(--bg-panel)', padding: '8px 12px', borderRadius: 12 }}><TypingDots /></div>
            </div>
          )}
        </div>
      }
    />
  );
}
