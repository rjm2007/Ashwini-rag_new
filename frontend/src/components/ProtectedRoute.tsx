"use client";

import { ReactNode, useEffect } from "react";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  useEffect(() => {
    // This function redirects to login page when token is missing.
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/";
    }
  }, []);
  return <>{children}</>;
}
