export default function EvidencePanel({ evidence }: { evidence: any[] }) {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-slate-800">Evidence</h3>
      <div className="space-y-2 text-xs">
        {evidence?.length ? (
          evidence.map((item, index) => (
            <div key={index} className="rounded-xl border border-slate-200 p-3">
              <p className="mb-1 text-[11px] font-semibold text-slate-600">
                Page: {item.pageNumber || "Unknown"}
              </p>
              <p className="line-clamp-5 text-[12px] text-slate-700">{item.chunkText || "No chunk text"}</p>
            </div>
          ))
        ) : (
          <p className="text-slate-500">No evidence yet.</p>
        )}
      </div>
    </aside>
  );
}
