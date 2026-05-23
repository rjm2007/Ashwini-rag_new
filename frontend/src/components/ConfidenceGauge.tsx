interface ConfidenceGaugeProps {
  value: number;
  showLabel?: boolean;
}

export default function ConfidenceGauge({ value, showLabel = true }: ConfidenceGaugeProps) {
  const percent = Math.max(0, Math.min(1, value));
  const color = percent >= 0.8 ? "#16A34A" : percent >= 0.5 ? "#D97706" : "#DC2626";
  const label = percent >= 0.8 ? "High" : percent >= 0.5 ? "Medium" : "Low";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 100,
          height: 6,
          backgroundColor: "#E8EEF4",
          borderRadius: 3,
          overflow: "hidden"
        }}
      >
        <div
          className="confidence-bar-fill"
          style={{
            height: "100%",
            width: `${Math.round(percent * 100)}%`,
            backgroundColor: color,
            borderRadius: 3
          }}
        />
      </div>
      <span style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#3D5A80", minWidth: 30 }}>
        {Math.round(percent * 100)}%
      </span>
      {showLabel && (
        <span style={{ fontSize: 11, fontWeight: 600, color }}>{label}</span>
      )}
    </div>
  );
}
