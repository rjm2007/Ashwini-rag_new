"use client";

import { useState } from "react";
import { useChat } from "../hooks/useChat";
import MessageBubble from "./MessageBubble";
import EvidencePanel from "./EvidencePanel";
import ConfidenceBadge from "./ConfidenceBadge";

export default function ChatWindow({ sessionId }: { sessionId: string }) {
  const { messages, sendMessage, loadingHistory, sending } = useChat(sessionId);
  const [input, setInput] = useState("");

  const onSend = async () => {
    // This function sends a chat message to backend query endpoint.
    if (!input.trim()) {
      return;
    }
    await sendMessage(input);
    setInput("");
  };

  const latestAssistant = [...messages].reverse().find((item) => item.role === "assistant");

  return (
    <div className="mx-auto w-full max-w-5xl">
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
        <div className="mb-3 h-[62vh] overflow-y-auto rounded-xl bg-slate-50 px-2 py-3">
          {loadingHistory ? <p className="px-3 text-sm text-slate-500">Loading conversation...</p> : null}
          {!loadingHistory && messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <p className="text-lg font-semibold text-slate-700">Ask anything about warranty coverage</p>
                <p className="mt-2 text-sm text-slate-500">
                  Example: What does Freightliner Cascadia 2023 powertrain warranty cover?
                </p>
              </div>
            </div>
          ) : null}
          {messages.map((message, index) => (
            <div key={index} className="px-2">
              <MessageBubble role={message.role} content={message.content} />
              {message.role === "assistant" && (
                <div className="mb-3 ml-1">
                  <ConfidenceBadge value={message.confidenceScore || 0} />
                </div>
              )}
            </div>
          ))}
          {sending ? (
            <div className="px-2 py-2 text-sm text-slate-500">Assistant is thinking...</div>
          ) : null}
        </div>
        <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white p-2">
          <input
            className="min-h-[44px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder="Ask warranty coverage question"
          />
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onSend}
            disabled={sending || !input.trim()}
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </section>

      <div className="mt-3">
        <EvidencePanel evidence={latestAssistant?.evidenceJson || []} />
      </div>
    </div>
  );
}
