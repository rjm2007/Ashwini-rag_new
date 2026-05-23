"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Check, AlertCircle } from "lucide-react";
import { login } from "../lib/auth";

const FEATURES = [
  "AI-Assisted Coverage Analysis",
  "Governed Document Repository",
  "Explainable Warranty Reasoning"
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
      router.push("/dashboard");
    } catch {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen">
      <section
        className="relative hidden w-[55%] flex-col justify-between p-12 md:flex"
        style={{ backgroundColor: "#06101E" }}
      >
        <div>
          <div
            style={{
              width: 40,
              height: 40,
              backgroundColor: "#FF6200",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <ShieldCheck size={24} color="white" />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-white">Warranty Intelligence Platform</h1>
          <p className="mt-3 text-base" style={{ color: "#8BAABF" }}>
            Governed AI-powered warranty document management
          </p>
          <div
            style={{
              width: 48,
              height: 3,
              backgroundColor: "#FF6200",
              borderRadius: 2,
              marginTop: 20
            }}
          />
        </div>

        <div className="space-y-4">
          {FEATURES.map((text) => (
            <div key={text} className="flex items-center gap-3">
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  border: "1px solid #FF6200",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                <Check size={12} color="#FF6200" />
              </div>
              <span className="text-sm" style={{ color: "#8BAABF" }}>
                {text}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex w-full flex-col justify-center bg-white px-12 py-16 md:w-[45%]">
        <form onSubmit={onSubmit} className="mx-auto w-full max-w-sm">
          <h2 className="text-2xl font-bold" style={{ color: "#0A1628" }}>
            Sign in to your account
          </h2>
          <p className="mt-1 mb-8 text-sm" style={{ color: "#7A92A8" }}>
            Warranty Intelligence Platform
          </p>

          <label className="mb-1.5 block text-sm font-medium" style={{ color: "#0A1628" }}>
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-[#FF6200]"
            style={{ borderColor: "#D1DCE8" }}
            required
          />

          <label className="mb-1.5 block text-sm font-medium" style={{ color: "#0A1628" }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-[#FF6200]"
            style={{ borderColor: "#D1DCE8" }}
            required
          />

          {error ? (
            <div
              className="mt-4 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm"
              style={{
                background: "#FEF2F2",
                borderColor: "#FCA5A5",
                color: "#DC2626"
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: loading ? "#E05500" : "#FF6200" }}
            onMouseEnter={(e) => {
              if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#E05500";
            }}
            onMouseLeave={(e) => {
              if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#FF6200";
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="mt-3 text-center text-xs" style={{ color: "#7A92A8" }}>
            Demo credentials pre-filled for POC
          </p>
        </form>
      </section>
    </main>
  );
}
