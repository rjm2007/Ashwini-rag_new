import { ReactNode } from "react";

export function parseAnswerWithCitations(text: string): ReactNode[] {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      return (
        <sup
          key={i}
          style={{
            color: "var(--accent)",
            fontSize: 10,
            fontWeight: 600,
            cursor: "default",
            marginLeft: 1
          }}
          title={`Citation ${match[1]}`}
        >
          [{match[1]}]
        </sup>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
