"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, Check, AlertCircle } from "lucide-react";
import { login } from "../lib/auth";

const FEATURES = [
  "Structured extraction from any document type",
  "Live AI pipeline, fully transparent",
  "Cited answers with confidence scoring"
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
    <main className="flex min-h-screen">
      <section
        className="relative hidden flex-col justify-between p-12 md:flex"
        style={{
          width: "55%",
          background: "#0D1117",
          borderRight: "1px solid var(--border)"
        }}
      >
        <div style={{ margin: "auto 0" }}>
          <Brain size={40} style={{ color: "var(--accent)" }} />
          <h1
            className="mt-6"
            style={{ fontSize: 22, fontWeight: 500, color: "var(--text-primary)", marginTop: 24 }}
          >
            Document Intelligence
          </h1>
          <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
            AI-powered policy analysis for enterprise.
          </p>
        </div>

        <div className="space-y-4" style={{ marginBottom: 24 }}>
          {FEATURES.map((text) => (
            <div key={text} className="flex items-center gap-3">
              <Check size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {text}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section
        className="flex w-full flex-col justify-center px-12 py-16 md:w-[45%]"
        style={{ background: "var(--bg-surface)" }}
      >
        <form onSubmit={onSubmit} className="mx-auto w-full" style={{ maxWidth: 320 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>
            Sign in
          </h2>

          <label
            className="mb-1.5 mt-8 block text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-lg px-3 py-2.5 text-sm outline-none"
            style={{
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--accent)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--border)";
            }}
            required
          />

          <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
            style={{
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--accent)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--border)";
            }}
            required
          />

          {error ? (
            <p className="mt-4 text-sm" style={{ color: "var(--state-failed)" }}>
              <AlertCircle size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg py-2.5 text-sm font-medium disabled:opacity-60"
            style={{
              background: loading ? "var(--accent-hover)" : "var(--accent)",
              color: "var(--bg-page)",
              border: "none",
              cursor: loading ? "wait" : "pointer"
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="mt-3 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            Demo credentials pre-filled for POC
          </p>
        </form>
      </section>
    </main>
  );
}
