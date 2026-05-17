export default function ConfidenceBadge({ value }: { value: number }) {
  let color = "bg-red-100 text-red-700";
  if (value > 0.8) {
    color = "bg-green-100 text-green-700";
  } else if (value >= 0.5) {
    color = "bg-yellow-100 text-yellow-700";
  }
  return <span className={`rounded px-2 py-1 text-xs ${color}`}>Confidence: {value}</span>;
}
