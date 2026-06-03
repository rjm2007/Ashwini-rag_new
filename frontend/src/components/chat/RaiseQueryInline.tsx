"use client";

import { useEffect, useState } from "react";
import { raiseQuery } from "../../lib/api";

export default function RaiseQueryInline({
  sessionId,
  question,
  answerSnapshot,
  documentId
}: {
  sessionId: string;
  question: string;
  answerSnapshot: string;
  documentId?: string;
}) {
  const [state, setState] = useState<"idle" | "confirm" | "error">("idle");

  useEffect(() => {
    if (state !== "confirm") return;
    const t = setTimeout(() => setState("idle"), 4000);
    return () => clearTimeout(t);
  }, [state]);

  const onRaise = async () => {
    try {
      await raiseQuery({ sessionId, question, answerSnapshot, documentId });
      setState("confirm");
    } catch {
      setState("error");
    }
  };

  return (
    <div style={{ marginTop: 8, textAlign: "right" }}>
      {state === "idle" ? (
        <button
          type="button"
          onClick={onRaise}
          style={{
            background: "none",
            border: "none",
            fontSize: 11,
            color: "var(--text-muted)",
            cursor: "pointer"
          }}
        >
          Raise a query ↗
        </button>
      ) : null}
      {state === "confirm" ? (
        <div
          className="animate-fade-in"
          style={{
            display: "inline-block",
            borderRadius: 6,
            background: "var(--gate-bg)",
            border: "1px solid var(--gate-color)",
            padding: "6px 10px",
            fontSize: 11,
            color: "var(--gate-color)"
          }}
        >
          Ticket raised. Our team will review this response.
        </div>
      ) : null}
      {state === "error" ? (
        <p style={{ fontSize: 11, color: "var(--state-failed)", margin: 0 }}>
          Could not raise ticket. Try again.
        </p>
      ) : null}
    </div>
  );
}
