'use client';

export default function PageChip({ page }: { page: number }) {
  return (
    <span className="mono" style={{
      fontSize: 10,
      background: 'var(--bg-raised)',
      border: '1px solid var(--border)',
      borderRadius: 3,
      padding: '1px 4px',
      color: 'var(--text-muted)',
      marginLeft: 6,
    }}>
      p.{page}
    </span>
  );
}
