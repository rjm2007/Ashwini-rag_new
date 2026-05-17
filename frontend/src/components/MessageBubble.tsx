export default function MessageBubble({ role, content }: { role: string; content: string }) {
  const isAssistant = role === "assistant";
  const container = isAssistant ? "justify-start" : "justify-end";
  const tone = isAssistant ? "bg-white border border-slate-200" : "bg-slate-900 text-white";
  return (
    <div className={`mb-3 flex ${container}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${tone}`}>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">
          {isAssistant ? "Assistant" : "You"}
        </p>
        <p className="whitespace-pre-wrap text-sm leading-6">{content}</p>
      </div>
    </div>
  );
}
