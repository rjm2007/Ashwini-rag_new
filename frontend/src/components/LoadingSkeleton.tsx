interface LoadingSkeletonProps {
  type: "card" | "row" | "stat";
  count?: number;
}

function SkeletonBox({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        backgroundColor: "#E8EEF4",
        borderRadius: 6,
        animation: "pulse-dot 1.5s ease-in-out infinite",
        ...style
      }}
    />
  );
}

export default function LoadingSkeleton({ type, count = 3 }: LoadingSkeletonProps) {
  if (type === "stat") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card" style={{ padding: 20 }}>
            <SkeletonBox style={{ height: 12, width: "60%", marginBottom: 12 }} />
            <SkeletonBox style={{ height: 32, width: "40%" }} />
          </div>
        ))}
      </div>
    );
  }

  if (type === "row") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 16,
              padding: "14px 16px",
              backgroundColor: "white",
              alignItems: "center"
            }}
          >
            <SkeletonBox style={{ height: 14, flex: 3 }} />
            <SkeletonBox style={{ height: 14, flex: 2 }} />
            <SkeletonBox style={{ height: 22, width: 80, borderRadius: 99 }} />
            <SkeletonBox style={{ height: 14, flex: 1 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ padding: 20 }}>
          <SkeletonBox style={{ height: 14, width: "70%", marginBottom: 10 }} />
          <SkeletonBox style={{ height: 12, width: "40%" }} />
        </div>
      ))}
    </div>
  );
}
