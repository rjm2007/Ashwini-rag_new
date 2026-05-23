"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, ShieldCheck } from "lucide-react";
import { useChat } from "../hooks/useChat";
import MessageBubble from "./MessageBubble";

const SUGGESTIONS = [
  "Is the turbocharger covered on a 2023 Freightliner Cascadia?",
  "What are the powertrain warranty limits?",
  "Which components are excluded from coverage?"
];

function formatTime(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    return new Date(value).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return undefined;
  }
}

export default function ChatWindow({ sessionId }: { sessionId: string }) {
  const { messages, sendMessage, loadingHistory, sending } = useChat(sessionId);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const onSend = async (override?: string) => {
    const value = (override ?? input).trim();
    if (!value || sending || !sessionId || sessionId === "new") return;
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    await sendMessage(value);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    const target = event.target;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 112)}px`;
  };

  const empty = !loadingHistory && messages.length === 0 && !sending;
  const canSend = input.trim().length > 0 && !sending;

  return (
    <div style={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column" }}>
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 16,
          backgroundColor: "#F0F4F8"
        }}
      >
        {loadingHistory ? (
          <p style={{ fontSize: 14, color: "#7A92A8" }}>Loading conversation...</p>
        ) : null}

        {empty ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "100%",
              textAlign: "center",
              padding: "40px 16px"
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                backgroundColor: "#FF6200",
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16
              }}
            >
              <ShieldCheck size={28} color="white" />
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#0A1628" }}>Warranty AI</p>
            <p style={{ fontSize: 14, color: "#7A92A8", marginTop: 8, marginBottom: 20 }}>
              Ask about warranty coverage for any certified vehicle
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 480, width: "100%" }}>
              {SUGGESTIONS.map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => onSend(text)}
                  style={{
                    border: "1px solid #D1DCE8",
                    backgroundColor: "white",
                    color: "#0A1628",
                    padding: "8px 14px",
                    borderRadius: 99,
                    fontSize: 13,
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message: any, index: number) => (
          <MessageBubble
            key={index}
            role={message.role}
            content={message.content}
            timestamp={formatTime(message.createdAt)}
            confidenceScore={
              message.role === "assistant" ? Number(message.confidenceScore || 0) : undefined
            }
            evidenceJson={message.role === "assistant" ? message.evidenceJson : undefined}
          />
        ))}

        {sending ? (
          <div className="animate-slide-in" style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                backgroundColor: "#06101E",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <ShieldCheck size={14} color="#FF6200" />
            </div>
            <div
              style={{
                backgroundColor: "white",
                border: "1px solid #D1DCE8",
                borderRadius: 18,
                padding: "12px 16px",
                fontSize: 13,
                color: "#7A92A8"
              }}
            >
              Assistant is thinking...
            </div>
          </div>
        ) : null}
      </div>

      <div
        style={{
          backgroundColor: "white",
          borderTop: "1px solid #D1DCE8",
          padding: "12px 16px",
          display: "flex",
          alignItems: "flex-end",
          gap: 10
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
          rows={1}
          placeholder="Ask about warranty coverage..."
          style={{
            flex: 1,
            border: "1px solid #D1DCE8",
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 14,
            resize: "none",
            outline: "none",
            fontFamily: "DM Sans, sans-serif",
            maxHeight: 112
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#FF6200";
            e.target.style.boxShadow = "0 0 0 3px #FFF0E6";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#D1DCE8";
            e.target.style.boxShadow = "none";
          }}
        />
        <button
          type="button"
          onClick={() => onSend()}
          disabled={!canSend}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            cursor: canSend ? "pointer" : "not-allowed",
            backgroundColor: canSend ? "#FF6200" : "#E8EEF4"
          }}
        >
          <ArrowUp size={18} color={canSend ? "white" : "#A8BCCF"} />
        </button>
      </div>
    </div>
  );
}
