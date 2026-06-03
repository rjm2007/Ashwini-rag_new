const TYPE_CONFIG: Record<string, { label: string; bg: string }> = {
  warranty_certificate: { label: "Warranty Certificate", bg: "var(--accent-dim)" },
  coverage_code_table: { label: "Coverage Codes", bg: "rgba(214, 158, 46, 0.12)" },
  repair_invoice: { label: "Invoice", bg: "rgba(124, 92, 255, 0.12)" },
  generic_document: { label: "Document", bg: "var(--bg-raised)" }
};

export default function TypePill({ docType }: { docType: string }) {
  const key = (docType || "generic_document").toLowerCase();
  const config = TYPE_CONFIG[key] || TYPE_CONFIG.generic_document;

  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 500,
        padding: "2px 8px",
        borderRadius: 99,
        background: config.bg,
        color: "var(--text-secondary)"
      }}
    >
      {config.label}
    </span>
  );
}
