import ConfidenceGauge from "./ConfidenceGauge";

export default function ConfidenceBadge({ value }: { value: number }) {
  return <ConfidenceGauge value={value} />;
}
