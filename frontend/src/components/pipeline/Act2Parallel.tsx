import StepRow, { StepRowData } from "./StepRow";

export default function Act2Parallel({
  schemaSteps,
  embeddingSteps,
  dimmed
}: {
  schemaSteps: StepRowData[];
  embeddingSteps: StepRowData[];
  dimmed: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
        opacity: dimmed ? 0.35 : 1,
        transition: "opacity 0.3s ease"
      }}
    >
      <div
        className="card"
        style={{ padding: 12, background: "var(--bg-surface)" }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            marginBottom: 8
          }}
        >
          Schema Pipeline
        </p>
        {schemaSteps.map((step, i) => (
          <div
            key={step.step_key}
            className="animate-fade-slide"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <StepRow step={step} />
          </div>
        ))}
      </div>
      <div
        className="card animate-fade-slide"
        style={{ padding: 12, background: "var(--bg-surface)", animationDelay: "200ms" }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            marginBottom: 8
          }}
        >
          Embedding Pipeline
        </p>
        {embeddingSteps.map((step, i) => (
          <div
            key={step.step_key}
            className="animate-fade-slide"
            style={{ animationDelay: `${200 + i * 50}ms` }}
          >
            <StepRow step={step} />
          </div>
        ))}
      </div>
    </div>
  );
}
