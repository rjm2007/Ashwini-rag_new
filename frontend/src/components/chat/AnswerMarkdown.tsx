import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AnswerMarkdownProps {
  text: string;
  evidence?: any[];
}

export default function AnswerMarkdown({ text, evidence = [] }: AnswerMarkdownProps) {
  // Preprocess text to turn [1] into [1](cite:1) so it parses as a link
  const processedText = text.replace(/\[(\d+)\]/g, "[$1](cite:$1)");

  return (
    <div style={{ lineHeight: 1.6 }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p style={{ margin: "0 0 12px" }}>{children}</p>,
          strong: ({ children }) => (
            <strong style={{ fontWeight: 700, color: "#E6EDF3" }}>{children}</strong>
          ),
          em: ({ children }) => <em style={{ fontStyle: "italic" }}>{children}</em>,
          ul: ({ children }) => <ul style={{ margin: "0 0 12px", paddingLeft: 20 }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ margin: "0 0 12px", paddingLeft: 20 }}>{children}</ol>,
          li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
          h1: ({ children }) => <h1 style={{ fontSize: 18, fontWeight: 600, margin: "16px 0 8px" }}>{children}</h1>,
          h2: ({ children }) => <h2 style={{ fontSize: 16, fontWeight: 600, margin: "14px 0 8px" }}>{children}</h2>,
          h3: ({ children }) => <h3 style={{ fontSize: 14, fontWeight: 600, margin: "12px 0 8px" }}>{children}</h3>,
          code: ({ children }) => (
            <code style={{ background: "rgba(0,0,0,0.1)", padding: "2px 4px", borderRadius: 4, fontSize: "0.9em", fontFamily: "monospace" }}>
              {children}
            </code>
          ),
          a: ({ href, children }) => {
            if (href?.startsWith("cite:")) {
              const citeId = href.replace("cite:", "");
              const ev = evidence[parseInt(citeId, 10) - 1];
              return (
                <sup
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    color: "white",
                    fontSize: 9,
                    fontWeight: 600,
                    margin: "0 2px",
                    cursor: ev ? "pointer" : "default",
                    verticalAlign: "super",
                  }}
                  title={ev?.text_reference || ev?.title || ""}
                >
                  {citeId}
                </sup>
              );
            }
            return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>{children}</a>;
          },
        }}
      >
        {processedText}
      </ReactMarkdown>
    </div>
  );
}
