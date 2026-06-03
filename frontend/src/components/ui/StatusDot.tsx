export default function StatusDot({
  status
}: {
  status: "running" | "done" | "failed" | "idle";
}) {
  const colors: Record<string, string> = {
    running: "var(--state-running)",
    done: "var(--state-done)",
    failed: "var(--state-failed)",
    idle: "var(--state-idle)"
  };

  return (
    <span
      className={status === "running" ? "animate-breathe" : undefined}
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        backgroundColor: colors[status],
        flexShrink: 0,
        display: "inline-block"
      }}
    />
  );
}
