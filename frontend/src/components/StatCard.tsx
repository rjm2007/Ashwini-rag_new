import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  iconColor?: string;
  iconBg?: string;
  accent?: boolean;
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  iconColor = "var(--accent)",
  iconBg = "var(--accent-soft)",
  accent = false
}: StatCardProps) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 600
            }}
          >
            {label}
          </p>
          <p
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: accent ? "var(--accent)" : "var(--text-primary)",
              marginTop: 8,
              lineHeight: 1
            }}
          >
            {value}
          </p>
        </div>
        <div
          style={{
            width: 44,
            height: 44,
            backgroundColor: iconBg,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}
        >
          <Icon size={22} color={iconColor} />
        </div>
      </div>
    </div>
  );
}
