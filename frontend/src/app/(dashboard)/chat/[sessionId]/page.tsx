"use client";

import { useEffect, useState } from "react";
import api from "../../../../lib/api";
import ChatWindow from "../../../../components/ChatWindow";

export default function ChatSessionPage({ params }: { params: { sessionId: string } }) {
  const [sessionId, setSessionId] = useState(params.sessionId);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    // This function creates a new session if route is /chat/new.
    if (params.sessionId === "new") {
      setCreating(true);
      api
        .post("/query/sessions", {})
        .then((response) => setSessionId(response.data.id))
        .finally(() => setCreating(false));
    }
  }, [params.sessionId]);

  return (
    <main>
      <h1 className="mb-4 text-xl font-semibold text-slate-800">Chat</h1>
      {creating ? <p className="mb-2 text-sm text-slate-500">Creating new chat...</p> : null}
      <ChatWindow sessionId={sessionId} />
    </main>
  );
}
