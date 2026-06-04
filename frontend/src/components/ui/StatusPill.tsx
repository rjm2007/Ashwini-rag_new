'use client';

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  processing: { color: 'var(--accent)', label: 'Processing' },
  parsing: { color: 'var(--accent)', label: 'Parsing' },
  structuring: { color: 'var(--accent)', label: 'Structuring' },
  classifying: { color: 'var(--accent)', label: 'Classifying' },
  schema_extraction: { color: 'var(--accent)', label: 'Extracting' },
  embedding: { color: 'var(--accent)', label: 'Embedding' },
  awaiting_certification: { color: 'var(--gate-amber)', label: 'Awaiting Certification' },
  ready_for_review: { color: 'var(--gate-amber)', label: 'Ready for Review' },
  processing_complete: { color: 'var(--state-done)', label: 'Complete' },
  certified: { color: 'var(--state-done)', label: 'Certified' },
  failed: { color: 'var(--state-failed)', label: 'Failed' },
  uploaded: { color: 'var(--state-idle)', label: 'Uploaded' },
};

export default function StatusPill({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { color: 'var(--state-idle)', label: status };
  return (
    <span style={{
      fontSize: 11, fontWeight: 500,
      border: `1px solid ${s.color}`,
      color: s.color,
      borderRadius: 99, padding: '2px 8px',
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}
