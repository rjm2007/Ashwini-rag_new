'use client';

const TYPE_MAP: Record<string, { label: string; bg: string; color: string }> = {
  warranty_certificate: { label: 'Warranty Certificate', bg: 'rgba(74,203,188,0.12)', color: 'var(--accent)' },
  coverage_code_table: { label: 'Coverage Codes', bg: 'rgba(237,180,84,0.12)', color: 'var(--gate-amber)' },
  repair_invoice: { label: 'Invoice', bg: 'rgba(169,139,240,0.12)', color: 'var(--cat-terms)' },
  generic_document: { label: 'Document', bg: 'var(--bg-raised)', color: 'var(--text-muted)' },
};

export default function TypePill({ type }: { type: string }) {
  const t = TYPE_MAP[type] || TYPE_MAP.generic_document;
  return (
    <span style={{
      fontSize: 10, fontWeight: 500,
      background: t.bg, color: t.color,
      borderRadius: 99, padding: '2px 8px',
      whiteSpace: 'nowrap',
    }}>
      {t.label}
    </span>
  );
}
