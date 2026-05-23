"use client";

import { ReactNode, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/";
    } else {
      setChecking(false);
    }
  }, []);

  if (checking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F0F4F8"
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 56,
              height: 56,
              backgroundColor: "#FF6200",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px"
            }}
          >
            <ShieldCheck size={28} color="white" />
          </div>
          <p style={{ fontSize: 14, color: "#7A92A8" }}>Checking credentials...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
