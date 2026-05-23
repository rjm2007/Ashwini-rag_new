"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import api from "../../../../lib/api";
import ChatWindow from "../../../../components/ChatWindow";

function formatRelative(value?: string): string {
  if (!value) return "—";
  try {
    const diff = Date.now() - new Date(value).getTime();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diff < minute) return "just now";
    if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
    if (diff < day) return `${Math.floor(diff / hour)}h ago`;
    return `${Math.floor(diff / day)}d ago`;
  } catch {
    return value;
  }
}

export default function ChatSessionPage({ params }: { params: { sessionId: string } }) {
  const [sessionId, setSessionId] = useState(params.sessionId);
  const [creating, setCreating] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    if (params.sessionId === "new") {
      setCreating(true);
      api
        .post("/query/sessions", {})
        .then((response) => setSessionId(response.data.id))
        .finally(() => setCreating(false));
    } else {
      setSessionId(params.sessionId);
    }
  }, [params.sessionId]);

  useEffect(() => {
    api
      .get("/query/sessions")
      .then((response) => setSessions(Array.isArray(response.data) ? response.data : []))
      .catch(() => setSessions([]));
  }, [sessionId]);

  return (
    <div
      className="animate-page-in"
      style={{
        display: "flex",
        height: "calc(100vh - 112px)",
        margin: "-24px",
        backgroundColor: "#FFFFFF"
      }}
    >
      <aside
        className="hidden md:flex"
        style={{
          width: "30%",
          maxWidth: 300,
          borderRight: "1px solid #D1DCE8",
          flexDirection: "column",
          flexShrink: 0
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid #D1DCE8"
          }}
        >
          <span className="text-sm font-semibold" style={{ color: "#0A1628" }}>
            Conversations
          </span>
          <Link
            href="/chat/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              backgroundColor: "#FF6200",
              color: "white",
              padding: "5px 10px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none"
            }}
          >
            <Plus size={12} />
            New
          </Link>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {sessions.map((session) => {
            const active = session.id === sessionId;
            return (
              <Link
                key={session.id}
                href={`/chat/${session.id}`}
                style={{
                  display: "block",
                  padding: "12px 16px",
                  textDecoration: "none",
                  backgroundColor: active ? "#FFF0E6" : "white",
                  borderLeft: active ? "3px solid #FF6200" : "3px solid transparent"
                }}
              >
                <p className="truncate text-sm font-medium" style={{ color: "#0A1628" }}>
                  {session.title || "Untitled chat"}
                </p>
                <p className="text-xs" style={{ color: "#7A92A8", marginTop: 4 }}>
                  {formatRelative(session.lastMessageAt || session.createdAt)}
                </p>
              </Link>
            );
          })}
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
        {creating ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#7A92A8",
              fontSize: 14
            }}
          >
            Creating new chat...
          </div>
        ) : (
          <ChatWindow sessionId={sessionId} />
        )}
      </div>
    </div>
  );
}
