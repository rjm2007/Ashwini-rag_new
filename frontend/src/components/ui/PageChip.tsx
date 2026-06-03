export default function PageChip({ page }: { page: number }) {
  return (
    <span
      className="mono"
      style={{
        fontSize: 10,
        color: "var(--text-muted)",
        background: "var(--bg-raised)",
        borderRadius: 3,
        padding: "1px 5px",
        marginLeft: 6
      }}
    >
      p.{page}
    </span>
  );
}
