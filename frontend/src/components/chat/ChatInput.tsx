"use client";

import { useState, KeyboardEvent } from "react";
import { SendHorizonal } from "lucide-react";

export default function ChatInput({
  disabled,
  sending,
  onSend
}: {
  disabled?: boolean;
  sending?: boolean;
  onSend: (text: string) => void;
}) {
  const [value, setValue] = useState("");

  const submit = () => {
    const text = value.trim();
    if (!text || disabled || sending) return;
    setValue("");
    onSend(text);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      style={{
        height: 56,
        borderTop: "1px solid var(--border)",
        padding: "0 12px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled || sending}
        placeholder="Ask about this document…"
        style={{
          flex: 1,
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "8px 12px",
          fontSize: 13,
          color: "var(--text-primary)",
          outline: "none",
          opacity: disabled ? 0.5 : 1
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "var(--accent)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "var(--border)";
        }}
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled || sending || !value.trim()}
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "var(--accent)",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: disabled || sending ? "not-allowed" : "pointer",
          opacity: disabled || sending || !value.trim() ? 0.4 : 1
        }}
      >
        {sending ? (
          <span className="border-spin" />
        ) : (
          <SendHorizonal size={16} color="var(--bg-page)" />
        )}
      </button>
    </div>
  );
}
