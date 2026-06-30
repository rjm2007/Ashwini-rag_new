"use client";

import { useEffect, useState } from "react";
import { Sparkles, Save, Loader2, CheckCircle2 } from "lucide-react";
import { listVapiAgents, getVapiAgentPrompt, updateVapiAgentPrompt } from "@/lib/api";

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

interface VapiAgentOption {
  key: string;
  name: string;
  assistantId: string;
}

export default function SettingsPage() {
  const [agents, setAgents] = useState<VapiAgentOption[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listVapiAgents()
      .then((res) => {
        const list: VapiAgentOption[] = res.data || [];
        setAgents(list);
        if (list.length > 0) setSelectedKey(list[0].key);
      })
      .catch(() => setError("Could not load the list of agents."));
  }, []);

  useEffect(() => {
    if (!selectedKey) return;
    setError("");
    setSaved(false);
    setLoadingPrompt(true);
    getVapiAgentPrompt(selectedKey)
      .then((res) => setPrompt(res.data?.prompt || ""))
      .catch(() => setError("Could not load this agent's current prompt from Vapi."))
      .finally(() => setLoadingPrompt(false));
  }, [selectedKey]);

  const onSave = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await updateVapiAgentPrompt(selectedKey, prompt);
      setSaved(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not save this prompt to Vapi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "100%", background: COLORS.bgPage, padding: "40px 24px", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 680 }}>
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
                width: 36, height: 36, borderRadius: 10, background: COLORS.accentSoft,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              <Sparkles size={18} color={COLORS.accent} />
            </div>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: COLORS.textPrimary, margin: 0 }}>
              Voice Agent Settings
            </h1>
          </div>

          <p style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.5, margin: "8px 0 28px" }}>
            Edit a voice agent's system prompt here. Saving pushes the change live to Vapi —
            the agent will use the new prompt on its very next call.
          </p>

          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}>
            Agent
          </label>
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            style={{
              width: "100%", padding: "9px 12px", fontSize: 13, borderRadius: 10,
              border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary, background: COLORS.bgCard,
              marginBottom: 20,
            }}
          >
            {agents.length === 0 && <option value="">No agents configured</option>}
            {agents.map((a) => (
              <option key={a.key} value={a.key}>
                {a.name}
              </option>
            ))}
          </select>

          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}>
            System prompt
          </label>
          <div style={{ position: "relative" }}>
            <textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setSaved(false);
              }}
              disabled={loadingPrompt || !selectedKey}
              rows={16}
              style={{
                width: "100%", padding: 14, fontSize: 13, lineHeight: 1.6, fontFamily: "monospace",
                borderRadius: 12, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary,
                background: loadingPrompt ? "#F8FAFC" : COLORS.bgCard, resize: "vertical", boxSizing: "border-box",
              }}
            />
            {loadingPrompt && (
              <div
                style={{
                  position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(255,255,255,0.6)", borderRadius: 12,
                }}
              >
                <Loader2 size={22} color={COLORS.accent} className="animate-spin" />
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
            {saved && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: COLORS.done }}>
                <CheckCircle2 size={14} /> Saved to Vapi
              </span>
            )}
            <button
              type="button"
              onClick={onSave}
              disabled={saving || loadingPrompt || !selectedKey || !prompt.trim()}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", fontSize: 13, fontWeight: 600,
                color: "#FFFFFF", background: COLORS.accent, border: "none", borderRadius: 10,
                cursor: saving || loadingPrompt ? "not-allowed" : "pointer",
                opacity: saving || loadingPrompt || !selectedKey || !prompt.trim() ? 0.6 : 1,
              }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Saving…" : "Save to Vapi"}
            </button>
          </div>

          {error && (
            <div
              style={{
                marginTop: 16, padding: "10px 14px", borderRadius: 10,
                background: COLORS.failedSoft, color: COLORS.failed, fontSize: 12.5,
              }}
            >
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
