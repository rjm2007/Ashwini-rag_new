import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 24px",
        textAlign: "center"
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          backgroundColor: "#FFF0E6",
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16
        }}
      >
        <Icon size={30} color="#FF6200" />
      </div>
      <p style={{ fontSize: 16, fontWeight: 600, color: "#0A1628", marginBottom: 8 }}>{title}</p>
      <p style={{ fontSize: 14, color: "#7A92A8", maxWidth: 320 }}>{description}</p>
      {action && (
        <Link
          href={action.href}
          style={{
            marginTop: 20,
            display: "inline-block",
            backgroundColor: "#FF6200",
            color: "white",
            padding: "8px 20px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none"
          }}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
