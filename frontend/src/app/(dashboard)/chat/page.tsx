"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, MessageCircle } from "lucide-react";
import api from "../../../lib/api";
import EmptyState from "../../../components/EmptyState";

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
    if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

export default function ChatSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    api
      .get("/query/sessions")
      .then((response) => setSessions(Array.isArray(response.data) ? response.data : []))
      .catch(() => setSessions([]));
  }, []);

  return (
    <div
      className="animate-page-in card"
      style={{
        display: "flex",
        height: "calc(100vh - 112px)",
        overflow: "hidden",
        borderRadius: 12
      }}
    >
      <aside
        style={{
          width: "30%",
          maxWidth: 300,
          borderRight: "1px solid #D1DCE8",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#FFFFFF"
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
          <h1 className="text-sm font-semibold" style={{ color: "#0A1628" }}>
            Conversations
          </h1>
          <Link
            href="/chat/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              backgroundColor: "#FF6200",
              color: "white",
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none"
            }}
          >
            <Plus size={14} />
            New Chat
          </Link>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={`/chat/${session.id}`}
              style={{
                display: "block",
                padding: "12px 16px",
                textDecoration: "none",
                borderBottom: "1px solid #F0F4F8",
                backgroundColor: "white"
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "#F0F4F8";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "white";
              }}
            >
              <p
                className="truncate text-sm font-medium"
                style={{ color: "#0A1628" }}
              >
                {session.title || "Untitled chat"}
              </p>
              <p className="text-xs" style={{ color: "#7A92A8", marginTop: 4 }}>
                {formatRelative(session.lastMessageAt || session.createdAt)}
              </p>
            </Link>
          ))}
          {sessions.length === 0 ? (
            <p style={{ padding: 16, fontSize: 13, color: "#7A92A8", textAlign: "center" }}>
              No conversations yet
            </p>
          ) : null}
        </div>
      </aside>

      <section style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <EmptyState
          icon={MessageCircle}
          title="Select a conversation"
          description="Choose from the list or start a new chat."
          action={{ label: "New Chat", href: "/chat/new" }}
        />
      </section>
    </div>
  );
}
