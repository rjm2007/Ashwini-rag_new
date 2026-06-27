"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, SendHorizontal, Bot } from "lucide-react";
import { createChatSession, getChatSession, sendChatMessage } from "../../lib/api";
import { getStoredSession, storeSession, clearSession } from "../../lib/chatSession";
import { inferCoverageDecision } from "./CoverageDecision";
import CoverageDecisionTag from "./CoverageDecision";
import ConfidenceBand from "./ConfidenceBand";
import SourcesPanel from "./SourcesPanel";
import AnswerMarkdown from "./AnswerMarkdown";
import type { ChatMessageItem, EvidencePayload, QueryContext, CoverageDecision, CoverageListItem, DocumentDetail, MultiDecisionResponse } from "../../lib/types";
import ClauseResultsCard, { decisionBadge } from "./ClauseResultsCard";
import DisambiguationCard from "./DisambiguationCard";

import DecisionCard, { type DecisionCardProps } from "./DecisionCard";
import CoverageListCard from "./CoverageListCard";

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

export default function AiAnalystPanel({ docId, filename, document }: AiAnalystPanelProps) {
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
    <div
      style={{
        width: "36%",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-surface)",
        borderRadius: "var(--r-md)",
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      {/* ===== Header ===== */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Sparkles size={16} color="var(--accent)" />
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            AI Warranty Analyst
          </span>
        </div>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            margin: "2px 0 8px",
          }}
        >
          Ask questions about this document
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <MonoChip text={filename} />
          <button
            onClick={handleResetChat}
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              padding: "2px 8px",
              cursor: "pointer",
            }}
          >
            Reset chat
          </button>
        </div>

        {/* Proactive eligibility inputs (replaces make/model/year) */}
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Purchase date</span>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              style={{
                fontSize: 11,
                fontFamily: "'IBM Plex Mono', monospace",
                padding: "4px 8px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--bg-raised)",
                color: "var(--text-primary)",
              }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Current mileage</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="e.g. 312000"
              value={currentMileage}
              onChange={(e) => setCurrentMileage(e.target.value)}
              style={{
                fontSize: 11,
                fontFamily: "'IBM Plex Mono', monospace",
                padding: "4px 8px",
                width: 120,
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--bg-raised)",
                color: "var(--text-primary)",
              }}
            />
          </label>
        </div>
        {(document?.make || document?.model || document?.year) && (
          <p
            style={{
              fontSize: 10,
              color: "var(--text-secondary)",
              margin: "8px 0 0",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            {[document?.make, document?.model, document?.year].filter(Boolean).join(" \u00b7 ")}
          </p>
        )}
        <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "6px 0 0" }}>
          Optional — fill these so I can check coverage without asking.
        </p>
      </div>

      {/* ===== Messages ===== */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
        }}
      >
        {loading && (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading conversation…</p>
        )}

        {!loading && messages.length === 0 && !sending && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 200,
              textAlign: "center",
              padding: "20px 0",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "var(--accent-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Bot size={20} color="var(--accent)" />
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
              Ask anything about this document to get started.
            </p>
            <SuggestionChips suggestions={SUGGESTED_QUESTIONS} onSelect={handleSend} />
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, index) => {
            const isUser = msg.role === "user";

            if (isUser) {
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: EASE_PRIMARY }}
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      maxWidth: "80%",
                      background: "var(--accent-soft)",
                      border: "1px solid var(--border-accent)",
                      borderRadius: "12px 12px 2px 12px",
                      padding: "10px 14px",
                      fontSize: 13,
                      color: "var(--text-primary)",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              );
            }

            /* ----- Assistant message ----- */
            const confidence = msg.confidenceScore ?? 0;
            const evidencePayload = msg.evidenceJson as EvidencePayload[] | { evidence?: EvidencePayload[] } | undefined;
            const evidence = Array.isArray(evidencePayload)
              ? evidencePayload
              : (evidencePayload as { evidence?: EvidencePayload[] })?.evidence || [];
            const structured = !Array.isArray(msg.evidenceJson) ? (msg.evidenceJson as Record<string, unknown>) : {};
            const responseType = msg.responseType || (structured.responseType as string | undefined);
            const decision =
              msg.coverageDecision ||
              (structured.coverageDecision as CoverageDecision | undefined) ||
              inferCoverageDecision(confidence, msg.metadataFiltersAppliedJson);

            const metaFilters = msg.metadataFiltersAppliedJson || {};
            const costObj = metaFilters.cost as { usd?: number } | undefined;
            const turnCostUsd = msg.costUsd ?? costObj?.usd ?? (structured.turnCostUsd as number | undefined);

            const isLatestAssistant =
              index === messages.length - 1 || 
              (index === messages.length - 1 && msg.role === "assistant");

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE_PRIMARY }}
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                {/* AI glyph */}
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "var(--accent-soft)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <Bot size={13} color="var(--accent)" />
                </div>

                <div
                  style={{
                    maxWidth: "85%",
                    background: "var(--bg-page)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px 12px 12px 2px",
                    padding: "10px 14px",
                    fontSize: 13,
                    color: "var(--text-primary)",
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ lineHeight: 1.6 }}>
                    <AnswerMarkdown text={msg.content} evidence={evidence} />
                  </div>

                  {/* Coverage decision badge */}
                  {responseType === "multi_decision" ? (() => {
                    const badge = decisionBadge(decision);
                    return (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6, padding: "4px 10px", borderRadius: 999, background: "var(--bg-hover)", fontSize: 12, fontWeight: 600, color: badge.color }}>
                        {badge.label}
                      </div>
                    );
                  })() : decision && <CoverageDecisionTag decision={decision} />}

                  {responseType === "multi_decision" ? (
                    <ClauseResultsCard data={structured as unknown as MultiDecisionResponse} />
                  ) : null}

                  {responseType === "disambiguation" && Array.isArray(structured.candidates) ? (
                    <DisambiguationCard
                      prompt={msg.content}
                      candidates={structured.candidates as Array<{ coverage_id: string; label: string }>}
                      onSelect={(coverageId) => {
                        const ctx = buildContext({ selectedCoverageId: coverageId });
                        setContext(ctx);
                        handleSend(`Selected coverage ${coverageId}`, ctx);
                      }}
                    />
                  ) : null}

                  {/* Inline eligibility form removed by design — the Purchase date / Current
                      mileage fields at the top of this panel are the single source of
                      eligibility. The assistant points users there instead. */}

                  {responseType === "decision" ? (
                    <DecisionCard
                      coverageDecision={
                        (structured.coverageDecision as CoverageDecision) ||
                        (structured.decision as { decision?: CoverageDecision })?.decision ||
                        decision
                      }
                      explanation={structured.explanation as string | undefined}
                      matchedComponent={structured.matchedComponent as DecisionCardProps["matchedComponent"]}
                      assetEligibility={structured.asset_eligibility as import("../../lib/types").ClauseEligibility | undefined}
                      durationMonths={structured.durationMonths as number | null | undefined}
                      mileageLimit={structured.mileageLimit as number | null | undefined}
                      mileageUnit={structured.mileageUnit as string | null | undefined}
                      checks={structured.checks as DecisionCardProps["checks"]}
                      evidence={(structured.evidence as DecisionCardProps["evidence"]) || evidence}
                      exclusions={structured.exclusions as DecisionCardProps["exclusions"]}
                      conditions={structured.conditions as DecisionCardProps["conditions"]}
                      limitOfLiability={structured.limitOfLiability as DecisionCardProps["limitOfLiability"]}
                      deductible={structured.deductible as DecisionCardProps["deductible"]}
                      planTier={structured.planTier as string | undefined}
                      confidence={confidence}
                      turnCostUsd={structured.turnCostUsd as number | undefined}
                      reasons={(structured.decision as { reasons?: string[] })?.reasons}
                    />
                  ) : null}

                  {responseType === "coverage_list" && Array.isArray(structured.coverages) ? (
                    <CoverageListCard coverages={structured.coverages as CoverageListItem[]} />
                  ) : null}

                  {/* Sources panel */}
                  <SourcesPanel sources={evidence} answerText={msg.content} />

                  {turnCostUsd !== undefined && (
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 8, textAlign: "right" }}>
                      Cost: ${turnCostUsd.toFixed(4)}
                    </div>
                  )}

                  {/* Suggested follow-ups for the latest assistant message */}
                  {isLatestAssistant && showSuggestions && (
                    <SuggestionChips
                      suggestions={SUGGESTED_QUESTIONS}
                      onSelect={onSend}
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Typing indicator */}
        {sending && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "var(--accent-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Bot size={13} color="var(--accent)" />
            </div>
            <div
              style={{
                background: "var(--bg-page)",
                border: "1px solid var(--border)",
                borderRadius: "12px 12px 12px 2px",
                padding: "10px 16px",
              }}
            >
              <TypingDots />
            </div>
          </motion.div>
        )}
      </div>

      {/* ===== Composer ===== */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          padding: "12px 16px",
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={onKeyDown}
          disabled={!sessionId || sending}
          rows={1}
          placeholder="Ask anything about this document..."
          style={{
            flex: 1,
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-sm)",
            padding: "9px 12px",
            fontSize: 13,
            color: "var(--text-primary)",
            outline: "none",
            resize: "none",
            fontFamily: "Inter, sans-serif",
            maxHeight: 96,
            lineHeight: 1.5,
            opacity: !sessionId ? 0.5 : 1,
            transition: "border-color 150ms ease",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "var(--accent)";
            e.target.style.boxShadow = "0 0 0 3px var(--accent-soft)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "var(--border)";
            e.target.style.boxShadow = "none";
          }}
        />
        <button
          type="button"
          onClick={() => onSend(inputValue)}
          disabled={!sessionId || sending || !inputValue.trim()}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "var(--accent)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor:
              !sessionId || sending || !inputValue.trim()
                ? "not-allowed"
                : "pointer",
            opacity: !sessionId || sending || !inputValue.trim() ? 0.4 : 1,
            flexShrink: 0,
            transition: "opacity 150ms ease, background 150ms ease",
          }}
          onMouseEnter={(e) => {
            if (sessionId && !sending && inputValue.trim()) {
              (e.target as HTMLButtonElement).style.background = "var(--accent-hover)";
            }
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.background = "var(--accent)";
          }}
        >
          {sending ? (
            <TypingDots />
          ) : (
            <SendHorizontal size={16} color="white" />
          )}
        </button>
      </div>

      {/* ===== Disclaimer ===== */}
      <div
        style={{
          padding: "6px 16px 10px",
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        <p
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          AI responses may contain errors. Please verify important information.
        </p>
      </div>
    </div>
  );
}
