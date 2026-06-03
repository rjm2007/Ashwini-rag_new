export default function MonoChip({
  value,
  size = "default"
}: {
  value: string;
  size?: "sm" | "default";
}) {
  const isSm = size === "sm";
  return (
    <span
      className="mono"
      style={{
        fontSize: isSm ? 11 : 12,
        padding: isSm ? "1px 6px" : "2px 8px",
        background: "var(--bg-raised)",
        border: "1px solid var(--border)",
        borderRadius: 4,
        color: "var(--text-primary)"
      }}
    >
      {value}
    </span>
  );
}
