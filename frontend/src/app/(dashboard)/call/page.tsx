"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Loader2, RotateCcw, Sparkles, Mic } from "lucide-react";
import { listVapiAgents, startCallLog, getVapiPublicConfig } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const COLORS = {
  bgPage: "var(--bg-raised)",
  bgCard: "var(--bg-surface)",
  border: "var(--border)",
  textPrimary: "var(--text-primary)",
  textSecondary: "var(--text-secondary)",
  textMuted: "var(--text-muted)",
  accent: "var(--accent-hover)",
  accentSoft: "var(--accent-soft)",
  failed: "var(--state-failed)",
  failedSoft: "var(--error-bg)",
  done: "var(--state-done)",
  warn: "var(--warning)",
  warnSoft: "var(--warning-bg)",
};

type CallStatus = "idle" | "connecting" | "active" | "ending" | "ended";

// How long to wait for Vapi to confirm the hang-up before we tear the session
// down ourselves. Ending normally lands well inside this.
const HANGUP_CONFIRM_TIMEOUT_MS = 6000;

function StatusPill({ status }: { status: CallStatus }) {
  const map: Record<CallStatus, { label: string; color: string; bg: string }> = {
    idle: { label: "Ready", color: COLORS.textSecondary, bg: "var(--bg-raised)" },
    connecting: { label: "Connecting", color: COLORS.accent, bg: COLORS.accentSoft },
    active: { label: "In call", color: COLORS.done, bg: "var(--success-bg)" },
    ending: { label: "Ending", color: COLORS.warn, bg: COLORS.warnSoft },
    ended: { label: "Call ended", color: COLORS.textSecondary, bg: "var(--bg-raised)" },
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
        whiteSpace: "nowrap",
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

interface VapiAgentOption {
  key: string;
  name: string;
  assistantId: string;
}

export default function CallPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<CallStatus>("idle");
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState("");
  const [agents, setAgents] = useState<VapiAgentOption[]>([]);
  const [selectedAgentKey, setSelectedAgentKey] = useState<string>("");
  // Only set when the SDK failed to confirm a hang-up, so the manual escape
  // hatch appears when it is actually needed instead of sitting on screen
  // during every healthy call.
  const [needsManualReset, setNeedsManualReset] = useState(false);

  const vapiRef = useRef<any>(null);
  const hangupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listVapiAgents()
      .then((res) => {
        const list: VapiAgentOption[] = res.data || [];
        setAgents(list);
        if (list.length > 0) setSelectedAgentKey(list[0].key);
      })
      .catch(() => setError("Could not load the list of agents."));
  }, []);

  const clearHangupTimer = useCallback(() => {
    if (hangupTimerRef.current) {
      clearTimeout(hangupTimerRef.current);
      hangupTimerRef.current = null;
    }
  }, []);

  /**
   * Drops every listener and the instance itself. Without this each call would
   * leave its previous Vapi instance alive with its listeners still attached —
   * those orphans keep firing events that stomp the current call's status, and
   * hold the microphone open.
   */
  const disposeVapi = useCallback(() => {
    const vapi = vapiRef.current;
    vapiRef.current = null;
    if (!vapi) return;
    try {
      vapi.removeAllListeners?.();
    } catch (err) {
      console.error("vapi.removeAllListeners() failed:", err);
    }
    try {
      vapi.stop?.();
    } catch (err) {
      console.error("vapi.stop() failed during dispose:", err);
    }
  }, []);

  useEffect(() => {
    return () => {
      clearHangupTimer();
      disposeVapi();
    };
  }, [clearHangupTimer, disposeVapi]);

  const startCall = async () => {
    setError("");
    setNeedsManualReset(false);
    setStatus("connecting");
    try {
      const agent = agents.find((a) => a.key === selectedAgentKey);
      if (!agent) {
        setError("Pick an agent before starting the call.");
        setStatus("idle");
        return;
      }

      // Comes from the backend (database-first, env fallback) rather than the
      // frontend's own env, so a key saved in Settings > API Keys applies here
      // immediately.
      let publicKey = "";
      try {
        publicKey = (await getVapiPublicConfig()).data?.publicKey || "";
      } catch {
        publicKey = "";
      }
      if (!publicKey) {
        setError("Vapi is not configured — no public key set. Add one in Settings > API Keys.");
        setStatus("idle");
        return;
      }

      // Never stack instances: tear down anything left from a previous call
      // before creating the next one.
      disposeVapi();

      const { default: Vapi } = await import("@vapi-ai/web");
      const vapi = new Vapi(publicKey);
      vapiRef.current = vapi;

      vapi.on("call-start", () => {
        clearHangupTimer();
        setNeedsManualReset(false);
        setStatus("active");
      });
      vapi.on("call-end", () => {
        clearHangupTimer();
        setNeedsManualReset(false);
        setStatus("ended");
        setVolume(0);
        disposeVapi();
      });
      vapi.on("error", (e: any) => {
        clearHangupTimer();
        setError(e?.message || e?.errorMsg || "Call error — please try again.");
        setStatus("ended");
        setVolume(0);
        disposeVapi();
      });
      vapi.on("volume-level", (level: number) => setVolume(level || 0));

      // Tag this call with which agent and who's calling, so Vapi's
      // end-of-call-report webhook (received on the backend) can attribute
      // the Call Logs row to the right user.
      const call = await vapi.start(agent.assistantId, {
        metadata: {
          agentKey: agent.key,
          agentName: agent.name,
          appUserEmail: user?.email || null,
        },
      });

      // Create the Call Logs row immediately so "View thread" works the
      // instant the call starts. The transcript, summary, and
      // recommendation are filled in later by the backend when Vapi's
      // end-of-call-report webhook arrives — this is a best-effort ping,
      // failures are silently ignored so they never block the call itself.
      if (call?.id) {
        startCallLog(call.id, agent.key, agent.name).catch((e) =>
          console.warn("startCallLog ping failed (non-blocking):", e?.message)
        );
      }
    } catch (err: any) {
      clearHangupTimer();
      disposeVapi();
      setError(err?.message || "Could not start the call. Check your microphone permissions.");
      setStatus("idle");
    }
  };

  /**
   * Hangs up.
   *
   * Uses the SDK's end() rather than stop(): stop() only destroys the local
   * Daily object and can leave the Vapi-side call running, which is what made
   * hang-ups appear not to work. end() sends an explicit end-call control
   * message and, per the SDK, "always ends the call". stop() still runs after
   * it as a local-teardown backstop.
   *
   * The UI does not wait on the network to feel responsive: it moves to
   * "ending" immediately, and a watchdog force-releases everything if the
   * call-end event never arrives.
   */
  const endCall = async () => {
    if (status === "ending") return;
    setStatus("ending");
    setVolume(0);

    clearHangupTimer();
    hangupTimerRef.current = setTimeout(() => {
      // The SDK never confirmed. Release locally and tell the user plainly.
      disposeVapi();
      setStatus("ended");
      setNeedsManualReset(true);
    }, HANGUP_CONFIRM_TIMEOUT_MS);

    const vapi = vapiRef.current;
    try {
      vapi?.end?.();
    } catch (err) {
      console.error("vapi.end() failed:", err);
    }
    try {
      await vapi?.stop?.();
    } catch (err) {
      console.error("vapi.stop() failed:", err);
    }
  };

  // Last resort, only offered when the watchdog fired. Reloading destroys the
  // JS context and any lingering WebRTC connection with it, so the microphone
  // is released no matter what state the SDK is in.
  const forceReset = () => window.location.reload();

  const selectedAgent = agents.find((a) => a.key === selectedAgentKey);

  return (
    <div
      style={{
        minHeight: "100%",
        background: COLORS.bgPage,
        padding: "40px 24px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div
          style={{
            background: COLORS.bgCard,
            borderRadius: 20,
            border: `1px solid ${COLORS.border}`,
            boxShadow: "0 1px 2px rgba(13,16,23,0.04), 0 8px 24px rgba(13,16,23,0.06)",
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
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 17, fontWeight: 700, color: COLORS.textPrimary, margin: 0 }}>
                Fixyee Voice Assistant
              </h1>
            </div>
            <StatusPill status={status} />
          </div>

          <p style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.5, margin: "8px 0 20px" }}>
            Demo only — general guidance based on common coverage categories. Does not check a
            specific vehicle&apos;s actual records or create a defect report.
          </p>

          {agents.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <label
                htmlFor="agent"
                style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}
              >
                Agent
              </label>
              <select
                id="agent"
                value={selectedAgentKey}
                onChange={(e) => setSelectedAgentKey(e.target.value)}
                disabled={status !== "idle" && status !== "ended"}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  fontSize: 13,
                  borderRadius: 10,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.textPrimary,
                  background: COLORS.bgCard,
                  cursor: status !== "idle" && status !== "ended" ? "not-allowed" : "pointer",
                }}
              >
                {agents.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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
                    pointerEvents: "none",
                  }}
                />
              )}

              {status === "idle" || status === "ended" ? (
                <button
                  type="button"
                  onClick={startCall}
                  aria-label="Start call"
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: "50%",
                    border: "none",
                    cursor: "pointer",
                    background: `linear-gradient(135deg, var(--accent), ${COLORS.accent})`,
                    color: "var(--accent-fg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 10px 28px rgba(240,166,74,0.35)",
                  }}
                >
                  <Phone size={32} />
                </button>
              ) : status === "connecting" ? (
                <div
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: "50%",
                    background: COLORS.bgCard,
                    border: `2px solid ${COLORS.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Loader2 size={28} color={COLORS.accent} className="animate-spin" />
                </div>
              ) : (
                // active | ending — the same button, disabled while ending so a
                // second press cannot fire another hang-up mid-teardown.
                <button
                  type="button"
                  onClick={endCall}
                  disabled={status === "ending"}
                  aria-label="End call"
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: "50%",
                    border: "none",
                    cursor: status === "ending" ? "wait" : "pointer",
                    background:
                      status === "ending"
                        ? "var(--bg-raised)"
                        : `linear-gradient(135deg, var(--state-failed), ${COLORS.failed})`,
                    color: status === "ending" ? COLORS.textSecondary : "var(--accent-fg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: status === "ending" ? "none" : "0 10px 28px rgba(240,113,111,0.35)",
                    transition: "background 150ms ease, box-shadow 150ms ease",
                  }}
                >
                  {status === "ending" ? (
                    <Loader2 size={28} className="animate-spin" />
                  ) : (
                    <PhoneOff size={32} />
                  )}
                </button>
              )}
            </div>

            <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: 0, textAlign: "center" }}>
              {status === "idle" && "Tap to start a call"}
              {status === "connecting" && "Connecting…"}
              {status === "active" && "Tap the red button to hang up"}
              {status === "ending" && "Ending call…"}
              {status === "ended" && "Call ended"}
            </p>

            {status === "active" && (
              <p
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11.5,
                  color: COLORS.textMuted,
                  margin: "8px 0 0",
                }}
              >
                <Mic size={12} /> Microphone is live — speak naturally
              </p>
            )}

            {/* Only after the watchdog fired: the hang-up was not confirmed. */}
            {needsManualReset && (
              <div
                style={{
                  marginTop: 18,
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: COLORS.warnSoft,
                  border: `1px solid var(--warning)`,
                  maxWidth: 380,
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: 12.5, color: COLORS.warn, margin: "0 0 8px", lineHeight: 1.5 }}>
                  The call was released locally, but the service never confirmed it. Reload if you can
                  still hear the assistant.
                </p>
                <button
                  type="button"
                  onClick={forceReset}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: COLORS.warn,
                    background: COLORS.bgCard,
                    border: `1px solid var(--warning)`,
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  <RotateCcw size={12} />
                  Reload page
                </button>
              </div>
            )}

            {error && (
              <div
                style={{
                  marginTop: 18,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: COLORS.failedSoft,
                  color: COLORS.failed,
                  fontSize: 12.5,
                  textAlign: "center",
                  maxWidth: 380,
                }}
              >
                {error}
              </div>
            )}
          </div>
        </div>

        {selectedAgent && status === "idle" && (
          <p style={{ fontSize: 11.5, color: COLORS.textMuted, textAlign: "center", marginTop: 14 }}>
            You&apos;ll be connected to {selectedAgent.name}. Your browser will ask for microphone access.
          </p>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse-dot {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.35;
          }
        }
      `}</style>
    </div>
  );
}
