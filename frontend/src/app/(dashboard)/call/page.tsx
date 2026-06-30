"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Loader2, RotateCcw, Sparkles } from "lucide-react";

const COLORS = {
  bgPage: "#F1F5F9",
  bgCard: "#FFFFFF",
  border: "#E2E8F0",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  accent: "#4F46E5",
  accentSoft: "#EEF2FF",
  failed: "#DC2626",
  failedSoft: "#FEF2F2",
  done: "#16A34A",
};

type CallStatus = "idle" | "connecting" | "active" | "ended";

function StatusPill({ status }: { status: CallStatus }) {
  const map: Record<CallStatus, { label: string; color: string; bg: string }> = {
    idle: { label: "Ready", color: COLORS.textSecondary, bg: "#F1F5F9" },
    connecting: { label: "Connecting", color: COLORS.accent, bg: COLORS.accentSoft },
    active: { label: "In call", color: COLORS.done, bg: "#F0FDF4" },
    ended: { label: "Call ended", color: COLORS.textSecondary, bg: "#F1F5F9" },
  };
  const s = map[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        color: s.color,
        background: s.bg,
        padding: "4px 12px",
        borderRadius: 999,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: s.color,
          ...(status === "active" ? { animation: "pulse-dot 1.4s ease-in-out infinite" } : {}),
        }}
      />
      {s.label}
    </span>
  );
}

export default function CallPage() {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState("");
  const vapiRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      try {
        vapiRef.current?.stop?.();
      } catch (err) {
        console.error("vapi.stop() failed on unmount:", err);
      }
    };
  }, []);

  const startCall = async () => {
    setError("");
    setStatus("connecting");
    try {
      const configRes = await fetch("/api/vapi-config");
      const { publicKey, assistantId } = await configRes.json();
      if (!publicKey || !assistantId) {
        setError("Vapi is not configured — missing public key or assistant ID on the server.");
        setStatus("idle");
        return;
      }

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
        setVolume(0);
      });
      vapi.on("volume-level", (level: number) => setVolume(level || 0));

      await vapi.start(assistantId);
    } catch (err: any) {
      setError(err?.message || "Could not start the call. Check your microphone permissions.");
      setStatus("idle");
    }
  };

  const endCall = async () => {
    try {
      await vapiRef.current?.stop?.();
    } catch (err) {
      console.error("vapi.stop() failed:", err);
    } finally {
      vapiRef.current = null;
      setStatus("ended");
      setVolume(0);
    }
  };

  // Guaranteed fallback — does not depend on the Vapi SDK behaving correctly
  // at all. Reloading the tab destroys the JS context and any underlying
  // WebRTC connection along with it, so the microphone is unconditionally
  // released no matter what state the SDK thinks it's in.
  const forceReset = () => {
    window.location.reload();
  };

  const isCallLive = status === "active" || status === "connecting";

  return (
    <div style={{ minHeight: "100%", background: COLORS.bgPage, padding: "40px 24px", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div
          style={{
            background: COLORS.bgCard,
            borderRadius: 20,
            border: `1px solid ${COLORS.border}`,
            boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)",
            padding: "32px 28px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: COLORS.accentSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Sparkles size={18} color={COLORS.accent} />
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 17, fontWeight: 700, color: COLORS.textPrimary, margin: 0 }}>
                Fixyee Voice Assistant
              </h1>
            </div>
            <StatusPill status={status} />
          </div>

          <p style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.5, margin: "8px 0 32px" }}>
            Demo only — general guidance based on common coverage categories. Does not check a
            specific vehicle's actual records or create a defect report.
          </p>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0 4px" }}>
            <div style={{ position: "relative", marginBottom: 20 }}>
              {status === "active" && (
                <div
                  style={{
                    position: "absolute",
                    inset: -10,
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
                    width: 88, height: 88, borderRadius: "50%", border: "none", cursor: "pointer",
                    background: `linear-gradient(135deg, #6366F1, ${COLORS.accent})`,
                    color: "#FFFFFF",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 10px 28px rgba(79,70,229,0.35)",
                  }}
                >
                  <Phone size={32} />
                </button>
              ) : status === "connecting" ? (
                <div
                  style={{
                    width: 88, height: 88, borderRadius: "50%",
                    background: COLORS.bgCard, border: `2px solid ${COLORS.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Loader2 size={28} color={COLORS.accent} className="animate-spin" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={endCall}
                  style={{
                    width: 88, height: 88, borderRadius: "50%", border: "none", cursor: "pointer",
                    background: `linear-gradient(135deg, #EF4444, ${COLORS.failed})`,
                    color: "#FFFFFF",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 10px 28px rgba(220,38,38,0.35)",
                  }}
                >
                  <PhoneOff size={32} />
                </button>
              )}
            </div>

            <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: 0 }}>
              {status === "idle" && "Tap to start a call"}
              {status === "connecting" && "Connecting…"}
              {status === "active" && "Call in progress — speak naturally"}
              {status === "ended" && "Call ended"}
            </p>

            {isCallLive && (
              <button
                type="button"
                onClick={forceReset}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  marginTop: 18, padding: "6px 12px", fontSize: 12, fontWeight: 500,
                  color: COLORS.textSecondary, background: "transparent",
                  border: `1px solid ${COLORS.border}`, borderRadius: 8, cursor: "pointer",
                }}
              >
                <RotateCcw size={12} />
                Call won't end? Tap here to reset
              </button>
            )}

            {error && (
              <div
                style={{
                  marginTop: 18, padding: "10px 14px", borderRadius: 10,
                  background: COLORS.failedSoft, color: COLORS.failed, fontSize: 12.5,
                  textAlign: "center", maxWidth: 360,
                }}
              >
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
