"use client";

import { ReactNode } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import ProtectedRoute from "../../components/ProtectedRoute";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1">
          <Topbar />
          <div className="p-6">{children}</div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
