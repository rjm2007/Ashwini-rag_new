"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import api from "../../../lib/api";

export default function ChatSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    // This function loads query sessions from backend.
    api.get("/query/sessions").then((response) => setSessions(response.data)).catch(() => setSessions([]));
  }, []);

  return (
    <main className="mx-auto w-full max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Chat Sessions</h1>
        <Link href="/chat/new" className="inline-block rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">
          New Chat
        </Link>
      </div>
      <div className="space-y-2">
        {sessions.map((session) => (
          <Link
            key={session.id}
            href={`/chat/${session.id}`}
            className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
          >
            <p className="text-sm font-medium text-slate-800">{session.title || "Untitled chat"}</p>
            <p className="mt-1 text-xs text-slate-500">
              Updated {new Date(session.lastMessageAt || session.createdAt).toLocaleString()}
            </p>
          </Link>
        ))}
        {sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            No chats yet. Start your first conversation.
          </div>
        ) : null}
      </div>
    </main>
  );
}
