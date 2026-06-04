'use client';

export default function MonoChip({ children, small }: { children: React.ReactNode; small?: boolean }) {
  return (
    <span style={{
      fontFamily: '"IBM Plex Mono", monospace',
      background: 'var(--bg-raised)',
      border: '1px solid var(--border)',
      borderRadius: 4,
      fontSize: small ? 10 : 12,
      padding: small ? '1px 5px' : '2px 8px',
    }}>
      {children}
    </span>
  );
}
