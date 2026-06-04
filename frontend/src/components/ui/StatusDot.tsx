'use client';

const STATUS_COLORS: Record<string, string> = {
  running: 'var(--state-running)',
  done: 'var(--state-done)',
  failed: 'var(--state-failed)',
  idle: 'var(--state-idle)',
};

export default function StatusDot({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.idle;
  return (
    <span
      className={status === 'running' ? 'animate-breathe' : ''}
      style={{
        display: 'inline-block',
        width: 8, height: 8,
        borderRadius: '50%',
        backgroundColor: color,
        flexShrink: 0,
      }}
    />
  );
}
