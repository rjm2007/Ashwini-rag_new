export default function DocumentStatusBadge({ status }: { status: string }) {
  const normalized = (status || "").toLowerCase();
  let tone = "bg-blue-100 text-blue-700";
  if (normalized.includes("failed") || normalized.includes("rejected")) {
    tone = "bg-red-100 text-red-700";
  } else if (normalized.includes("certified")) {
    tone = "bg-green-100 text-green-700";
  } else if (normalized.includes("pending")) {
    tone = "bg-amber-100 text-amber-700";
  }
  return <span className={`rounded px-2 py-1 text-xs ${tone}`}>{status}</span>;
}
