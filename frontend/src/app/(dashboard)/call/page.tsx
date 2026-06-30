"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Loader2 } from "lucide-react";

const COLORS = {
  bgPage: "#F8FAFC",
  bgPanel: "#FFFFFF",
  border: "#D1DCE8",
  textPrimary: "#0A1628",
  textSecondary: "#7A92A8",
  accent: "#4F46E5",
  failed: "#DC2626",
};

type CallStatus = "idle" | "connecting" | "active" | "ended";

interface TranscriptLine {
  role: "user" | "assistant";
  text: string;
}

export default function CallPage() {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [partialLine, setPartialLine] = useState<TranscriptLine | null>(null);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState("");
  const vapiRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      // Hard safety net — never leave a call running if this page unmounts.
      vapiRef.current?.stop?.();
    };
  }, []);

  const startCall = async () => {
    setError("");
    setTranscript([]);
    setPartialLine(null);
    setStatus("connecting");
    try {
      // Fetched at call-start time, not baked at build time — this is what
      // actually fixes the "missing public key or assistant ID" error.
      const configRes = await fetch("/api/vapi-config");
      const { publicKey, assistantId } = await configRes.json();
      if (!publicKey || !assistantId) {
        setError("Vapi is not configured — missing public key or assistant ID on the server.");
        setStatus("idle");
        return;
      }

      // Dynamic import keeps this WebRTC-only SDK out of any server-rendered
      // path — it must only ever load in the browser.
      const { default: Vapi } = await import("@vapi-ai/web");
      const vapi = new Vapi(publicKey);
      vapiRef.current = vapi;

      vapi.on("call-start", () => setStatus("active"));
      vapi.on("call-end", () => {
        setStatus("ended");
        setVolume(0);
      });
      vapi.on("error", (e: any) => {
        setError(e?.message || e?.errorMsg || "Call error — please try again.");
        setStatus("ended");
      });
      vapi.on("volume-level", (level: number) => setVolume(level || 0));
      vapi.on("message", (msg: any) => {
        if (msg?.type !== "transcript") return;
        const line: TranscriptLine = { role: msg.role, text: msg.transcript };
        if (msg.transcriptType === "final") {
          setTranscript((prev) => [...prev, line]);
          setPartialLine(null);
        } else {
          // Live, in-progress caption — overwritten until it's marked final.
          setPartialLine(line);
        }
      });

      // The assistant — name, system prompt, voice, and model — is fully
      // configured in the Vapi dashboard. We only ever reference it by ID.
      await vapi.start(assistantId);
    } catch (err: any) {
      setError(err?.message || "Could not start the call. Check your microphone permissions.");
      setStatus("idle");
    }
  };

  const endCall = () => {
    vapiRef.current?.stop?.();
    setStatus("ended");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: COLORS.bgPage }}>
      <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.bgPanel }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: COLORS.textPrimary, margin: 0 }}>
          Talk to the Fixyee Voice Assistant
        </h1>
        <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: "4px 0 0" }}>
          Demo only — general guidance based on common coverage categories. Does not check a
          specific vehicle's actual records or create a defect report.
        </p>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: 32, overflow: "auto" }}>
        <div style={{ marginBottom: 24, position: "relative" }}>
          {status === "active" && (
            <div
              style={{
                position: "absolute",
                inset: -8,
                borderRadius: "50%",
                border: `3px solid ${COLORS.accent}`,
                opacity: Math.min(0.15 + volume * 0.6, 0.6),
                transform: `scale(${1 + volume * 0.25})`,
                transition: "transform 80ms linear, opacity 80ms linear",
              }}
            />
          )}
          {status === "idle" || status === "ended" ? (
            <button
              type="button"
              onClick={startCall}
              style={{
                width: 96, height: 96, borderRadius: "50%", border: "none", cursor: "pointer",
                background: COLORS.accent, color: "#FFFFFF",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 8px 24px rgba(79,70,229,0.35)",
              }}
            >
              <Phone size={36} />
            </button>
          ) : status === "connecting" ? (
            <div
              style={{
                width: 96, height: 96, borderRadius: "50%",
                background: COLORS.bgPanel, border: `2px solid ${COLORS.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Loader2 size={32} color={COLORS.accent} className="animate-spin" />
            </div>
          ) : (
            <button
              type="button"
              onClick={endCall}
              style={{
                width: 96, height: 96, borderRadius: "50%", border: "none", cursor: "pointer",
                background: COLORS.failed, color: "#FFFFFF",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 8px 24px rgba(220,38,38,0.35)",
              }}
            >
              <PhoneOff size={36} />
            </button>
          )}
        </div>

        <p style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 24 }}>
          {status === "idle" && "Tap to start a call"}
          {status === "connecting" && "Connecting…"}
          {status === "active" && "Call in progress — speak naturally"}
          {status === "ended" && "Call ended"}
        </p>

        {error && <p style={{ fontSize: 13, color: COLORS.failed, marginBottom: 16 }}>{error}</p>}

        {(transcript.length > 0 || partialLine) && (
          <div style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: 10 }}>
            {transcript.map((line, i) => (
              <div
                key={i}
                style={{
                  alignSelf: line.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  background: line.role === "user" ? COLORS.accent : COLORS.bgPanel,
                  color: line.role === "user" ? "#FFFFFF" : COLORS.textPrimary,
                  border: line.role === "user" ? "none" : `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  padding: "8px 14px",
                  fontSize: 13,
                }}
              >
                {line.text}
              </div>
            ))}
            {partialLine && (
              <div
                style={{
                  alignSelf: partialLine.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  background: "transparent",
                  color: COLORS.textSecondary,
                  border: `1px dashed ${COLORS.border}`,
                  borderRadius: 12,
                  padding: "8px 14px",
                  fontSize: 13,
                  fontStyle: "italic",
                }}
              >
                {partialLine.text}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
