"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Check, AlertCircle } from "lucide-react";
import { login } from "../lib/auth";

const FEATURES = [
  "Structured extraction from any document type",
  "Live AI pipeline, fully transparent",
  "Cited answers with confidence scoring",
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/documents");
    } catch {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ display: "flex", minHeight: "100vh" }}>
      {/* Left branding panel */}
      <section
        style={{
          width: "55%",
          background: "#0E0F1A",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "64px 56px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle background gradient */}
        <div
          style={{
            position: "absolute",
            top: "-30%",
            right: "-20%",
            width: "60%",
            height: "60%",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Brand mark */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText size={22} color="#FFF" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#FFF" }}>Fixyee</div>
              <div style={{ fontSize: 12, color: "#9AA0B5" }}>AI Document Intelligence</div>
            </div>
          </div>

          <h1
            style={{
              fontSize: 32,
              fontWeight: 600,
              color: "#FFFFFF",
              lineHeight: 1.25,
              letterSpacing: "-0.02em",
              margin: "0 0 16px",
              maxWidth: 420,
            }}
          >
            Intelligent document understanding, powered by AI
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "#9AA0B5",
              lineHeight: 1.6,
              maxWidth: 400,
              margin: "0 0 40px",
            }}
          >
            Upload warranty documents and let AI extract, structure, and make them queryable —
            with full transparency and confidence scoring.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {FEATURES.map((f, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 14,
                  color: "#C7CCFF",
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "rgba(99,102,241,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Check size={13} color="#6366F1" />
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Right login form */}
      <section
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-page)",
          padding: "40px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 380 }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: "0 0 6px",
              letterSpacing: "-0.01em",
            }}
          >
            Sign in
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 32px" }}>
            Enter your credentials to access the platform
          </p>

          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  marginBottom: 6,
                }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@demo.com"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  fontSize: 14,
                  borderRadius: "var(--r-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 150ms ease",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  marginBottom: 6,
                }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  fontSize: 14,
                  borderRadius: "var(--r-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 150ms ease",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  borderRadius: "var(--r-sm)",
                  background: "var(--error-bg)",
                  border: "1px solid var(--state-failed)",
                  fontSize: 13,
                  color: "var(--state-failed)",
                }}
              >
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "11px",
                background: "var(--accent)",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "var(--r-sm)",
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                transition: "all 150ms ease",
                boxShadow: "var(--shadow-accent)",
              }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              marginTop: 24,
              textAlign: "center",
            }}
          >
            Demo credentials are pre-filled
          </p>
        </div>
      </section>
    </main>
  );
}
