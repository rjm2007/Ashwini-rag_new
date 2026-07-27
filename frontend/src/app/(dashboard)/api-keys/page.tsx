"use client";

import { useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ShieldCheck,
  Lock,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { listApiKeys, saveApiKey, clearApiKey, testApiKey } from "@/lib/api";
import type { ApiKeyStatus } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";

const COLORS = {
  bgCard: "#FFFFFF",
  bgSubtle: "#F8FAFC",
  border: "#E2E8F0",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  accent: "#4F46E5",
  accentSoft: "#EEF2FF",
  failed: "#DC2626",
  failedSoft: "#FEF2F2",
  done: "#16A34A",
  doneSoft: "#F0FDF4",
  warn: "#D97706",
  warnSoft: "#FFFBEB",
};

type Feedback = { kind: "ok" | "error" | "info"; message: string };

/** Which services each credential actually affects, shown on the card. */
const AFFECTS: Record<string, string[]> = {
  OPENAI_API_KEY: ["Document extraction", "Embeddings", "Chat answers", "Reranking"],
  VAPI_PRIVATE_KEY: ["Agent prompt editing", "Settings page"],
  VAPI_PUBLIC_KEY: ["Starting voice calls"],
};

function SourcePill({ source }: { source: ApiKeyStatus["source"] }) {
  const map = {
    database: { label: "Saved here", bg: COLORS.doneSoft, fg: COLORS.done },
    environment: { label: "From .env", bg: COLORS.warnSoft, fg: COLORS.warn },
    none: { label: "Not set", bg: COLORS.failedSoft, fg: COLORS.failed },
  } as const;
  const tone = map[source];
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 999,
        background: tone.bg,
        color: tone.fg,
        whiteSpace: "nowrap",
      }}
    >
      {tone.label}
    </span>
  );
}

function KeyCard({ status, onChanged }: { status: ApiKeyStatus; onChanged: (next: ApiKeyStatus) => void }) {
  const [value, setValue] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState<"save" | "test" | "clear" | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const run = async (kind: "save" | "test" | "clear", fn: () => Promise<void>) => {
    setBusy(kind);
    setFeedback(null);
    try {
      await fn();
    } catch (err: any) {
      const raw = err?.response?.data?.message;
      setFeedback({
        kind: "error",
        // Nest can return an array of validation messages.
        message: Array.isArray(raw) ? raw.join(", ") : raw || err?.message || "Something went wrong.",
      });
    } finally {
      setBusy(null);
    }
  };

  const onSave = () =>
    run("save", async () => {
      const res = await saveApiKey(status.key, value);
      onChanged(res.data);
      setValue("");
      setReveal(false);
      setFeedback({
        kind: "ok",
        message: status.appliesLive
          ? "Saved and live."
          : "Saved. Restart the ai-service container for it to take effect.",
      });
    });

  const onTest = () =>
    run("test", async () => {
      // Tests the typed-but-unsaved value when there is one, so a key can be
      // checked before it replaces a working one.
      const res = await testApiKey(status.key, value.trim() || undefined);
      setFeedback({ kind: res.data.ok ? "ok" : "error", message: res.data.message });
    });

  const onClear = () =>
    run("clear", async () => {
      const res = await clearApiKey(status.key);
      onChanged(res.data);
      setValue("");
      setFeedback({ kind: "info", message: "Removed. This key now falls back to the server environment." });
    });

  const canSave = busy === null && value.trim().length > 0;
  const canTest = busy === null && (value.trim().length > 0 || status.configured);

  return (
    <div
      style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>{status.label}</span>
        <SourcePill source={status.source} />
        {!status.appliesLive && (
          <span style={{ fontSize: 11, color: COLORS.warn, display: "flex", alignItems: "center", gap: 4 }}>
            <RefreshCw size={11} /> needs ai-service restart
          </span>
        )}
      </div>

      <p style={{ fontSize: 12.5, color: COLORS.textSecondary, margin: "0 0 14px", lineHeight: 1.55 }}>
        {status.help}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 10.5,
            color: COLORS.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontWeight: 600,
          }}
        >
          Current
        </span>
        <code
          style={{
            fontSize: 12,
            fontFamily: "'IBM Plex Mono', monospace",
            padding: "4px 10px",
            borderRadius: 6,
            background: COLORS.bgSubtle,
            border: `1px solid ${COLORS.border}`,
            color: status.configured ? COLORS.textPrimary : COLORS.textMuted,
            wordBreak: "break-all",
          }}
        >
          {status.configured ? status.preview : "not configured"}
        </code>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 260px", minWidth: 200 }}>
          <input
            type={status.isSecret && !reveal ? "password" : "text"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={status.configured ? "Enter a new value to replace it" : "Paste the key here"}
            autoComplete="off"
            spellCheck={false}
            style={{
              width: "100%",
              padding: status.isSecret ? "9px 38px 9px 12px" : "9px 12px",
              fontSize: 13,
              fontFamily: "'IBM Plex Mono', monospace",
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              background: "#FFFFFF",
              color: COLORS.textPrimary,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {status.isSecret && (
            <button
              type="button"
              onClick={() => setReveal((r) => !r)}
              aria-label={reveal ? "Hide value" : "Show value"}
              title={reveal ? "Hide value" : "Show value"}
              style={{
                position: "absolute",
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: COLORS.textMuted,
                cursor: "pointer",
                padding: 5,
                display: "flex",
                alignItems: "center",
              }}
            >
              {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 16px",
            borderRadius: 8,
            border: "none",
            background: COLORS.accent,
            color: "#FFFFFF",
            fontSize: 13,
            fontWeight: 600,
            cursor: canSave ? "pointer" : "not-allowed",
            opacity: canSave ? 1 : 0.45,
          }}
        >
          {busy === "save" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save
        </button>

        {status.testable && (
          <button
            type="button"
            onClick={onTest}
            disabled={!canTest}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 16px",
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              background: "#FFFFFF",
              color: COLORS.textPrimary,
              fontSize: 13,
              fontWeight: 500,
              cursor: canTest ? "pointer" : "not-allowed",
              opacity: canTest ? 1 : 0.45,
            }}
          >
            {busy === "test" ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            Test
          </button>
        )}

        {status.source === "database" && (
          <button
            type="button"
            onClick={onClear}
            disabled={busy !== null}
            title="Remove the saved value and fall back to the server environment"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 12px",
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              background: "#FFFFFF",
              color: COLORS.failed,
              fontSize: 13,
              fontWeight: 500,
              cursor: busy !== null ? "not-allowed" : "pointer",
              opacity: busy !== null ? 0.45 : 1,
            }}
          >
            {busy === "clear" ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Remove
          </button>
        )}
      </div>

      {feedback && (
        <div
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "flex-start",
            gap: 6,
            fontSize: 12,
            lineHeight: 1.5,
            color:
              feedback.kind === "ok" ? COLORS.done : feedback.kind === "error" ? COLORS.failed : COLORS.textSecondary,
          }}
        >
          {feedback.kind === "ok" ? (
            <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          ) : (
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          )}
          {feedback.message}
        </div>
      )}

      {AFFECTS[status.key] && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: `1px solid ${COLORS.border}`,
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 11, color: COLORS.textMuted, marginRight: 2 }}>Used by</span>
          {AFFECTS[status.key].map((area) => (
            <span
              key={area}
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 6,
                background: COLORS.bgSubtle,
                border: `1px solid ${COLORS.border}`,
                color: COLORS.textSecondary,
              }}
            >
              {area}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryPanel({ keys }: { keys: ApiKeyStatus[] }) {
  const configured = keys.filter((k) => k.configured).length;
  const missing = keys.filter((k) => !k.configured);
  const allSet = keys.length > 0 && configured === keys.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          background: COLORS.bgCard,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          padding: 20,
        }}
      >
        <h2
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: COLORS.textMuted,
            margin: "0 0 14px",
          }}
        >
          Status
        </h2>

        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 30, fontWeight: 700, color: allSet ? COLORS.done : COLORS.warn, lineHeight: 1 }}>
            {configured}
          </span>
          <span style={{ fontSize: 14, color: COLORS.textMuted }}>/ {keys.length} configured</span>
        </div>

        <p style={{ fontSize: 12, color: COLORS.textSecondary, margin: "10px 0 0", lineHeight: 1.5 }}>
          {allSet
            ? "Every credential the platform needs is present."
            : `Missing: ${missing.map((k) => k.label).join(", ")}. Features that depend on these will fail.`}
        </p>

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {keys.map((k) => (
            <div key={k.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: 12, color: COLORS.textSecondary, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {k.label}
              </span>
              <SourcePill source={k.source} />
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          background: COLORS.accentSoft,
          border: `1px solid #C7CCFF`,
          borderRadius: 12,
          padding: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Lock size={14} color={COLORS.accent} />
          <h2 style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.textPrimary, margin: 0 }}>How these are stored</h2>
        </div>
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.7 }}>
          <li>Encrypted (AES-256-GCM) before being written to the database.</li>
          <li>Only ever returned to this screen masked — never in full.</li>
          <li>Readable and editable by admins only.</li>
          <li>
            A value saved here overrides the matching <code style={{ fontSize: 11 }}>.env</code> variable. Remove it to
            fall back.
          </li>
        </ul>
      </div>
    </div>
  );
}

export default function ApiKeysPage() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKeyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listApiKeys()
      .then((res) => setKeys(res.data || []))
      .catch((err) =>
        setError(
          err?.response?.status === 403
            ? "API keys can only be managed by an admin."
            : "Could not load API keys from the server."
        )
      )
      .finally(() => setLoading(false));
  }, []);

  const onChanged = (next: ApiKeyStatus) => setKeys((prev) => prev.map((k) => (k.key === next.key ? next : k)));

  const ready = useMemo(() => !loading && !error && keys.length > 0, [loading, error, keys.length]);

  // Defence in depth: the backend already rejects non-admins, this just avoids
  // rendering a form that could never succeed.
  if (user && user.role !== "admin") {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ fontSize: 13, color: COLORS.failed }}>API keys can only be managed by an admin.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
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
          <KeyRound size={18} color={COLORS.accent} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: COLORS.textPrimary }}>API Keys</h1>
      </div>
      <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: "0 0 24px", maxWidth: 720 }}>
        Provider credentials used by the platform. Values are encrypted before they are stored and are never sent back
        to the browser in full.
      </p>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.textSecondary, fontSize: 13 }}>
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      )}

      {!loading && error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: COLORS.failed,
            fontSize: 13,
            background: COLORS.failedSoft,
            border: `1px solid #FCA5A5`,
            borderRadius: 10,
            padding: "12px 14px",
            maxWidth: 520,
          }}
        >
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {ready && (
        // Two columns on wide screens so the page fills the width with content
        // that earns its place; collapses to one column below ~1080px.
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 320px",
            gap: 20,
            alignItems: "start",
          }}
          className="api-keys-grid"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            {keys.map((status) => (
              <KeyCard key={status.key} status={status} onChanged={onChanged} />
            ))}
          </div>

          <SummaryPanel keys={keys} />
        </div>
      )}

      <style jsx>{`
        @media (max-width: 1080px) {
          .api-keys-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
