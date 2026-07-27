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
          backgroundColor: "var(--accent-soft)",
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16
        }}
      >
        <Icon size={30} color="var(--accent)" />
      </div>
      <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
        {title}
      </p>
      <p style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 320, lineHeight: 1.6 }}>
        {description}
      </p>
      {action && (
        <Link
          href={action.href}
          style={{
            marginTop: 20,
            display: "inline-block",
            backgroundColor: "var(--accent)",
            color: "var(--accent-fg)",
            padding: "8px 20px",
            borderRadius: "var(--r-md)",
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
