import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

export default function SectionCard({
  icon: Icon,
  title,
  children
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--bg-raised)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 16,
        marginBottom: 12
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          paddingBottom: 12,
          borderBottom: "1px solid var(--border)"
        }}
      >
        <Icon size={16} style={{ color: "var(--text-muted)" }} />
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.06em"
          }}
        >
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}
