"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  const onSubmit = async (event: React.FormEvent) => {
    // This function logs in the user and redirects to dashboard.
    event.preventDefault();
    setError("");
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch {
      setError("Login failed.");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded bg-white p-6 shadow">
        <h1 className="mb-4 text-xl font-semibold">Warranty Platform Login</h1>
        <input
          className="mb-3 w-full rounded border p-2"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
        />
        <input
          className="mb-3 w-full rounded border p-2"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          type="password"
        />
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <button className="w-full rounded bg-slate-900 p-2 text-white" type="submit">
          Login
        </button>
      </form>
    </main>
  );
}
