import { Check, X } from "lucide-react";

const STAGES = ["Uploaded", "OCR", "Extraction", "Review", "Certified"];

function getStageIndex(status: string): number {
  const s = status?.toLowerCase() || "";
  if (s.includes("certified") || s.includes("rejected") || s.includes("failed")) return 4;
  if (s.includes("ready_for_review")) return 3;
  if (s.includes("extraction") || s.includes("embedded")) return 2;
  if (s.includes("ocr")) return 1;
  return 0;
}

export default function StatusPipeline({ currentStatus }: { currentStatus: string }) {
  const activeIndex = getStageIndex(currentStatus);
  const isRejected =
    currentStatus?.toLowerCase().includes("rejected") ||
    currentStatus?.toLowerCase().includes("failed");

  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%", padding: "12px 0" }}>
      {STAGES.map((stage, i) => {
        const isDone = i < activeIndex;
        const isActive = i === activeIndex;
        const isFuture = i > activeIndex;
        const isFinalRejected = i === 4 && isRejected;

        return (
          <div
            key={stage}
            style={{ display: "flex", alignItems: "center", flex: i < STAGES.length - 1 ? "1" : "0" }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div
                className={isActive ? "pulse" : ""}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  backgroundColor: isFinalRejected
                    ? "#DC2626"
                    : isDone || isActive
                      ? "#FF6200"
                      : "#E8EEF4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: isActive ? "2px solid #FF6200" : "none",
                  boxShadow: isActive ? "0 0 0 4px #FFF0E6" : "none"
                }}
              >
                {isFinalRejected ? (
                  <X size={14} color="white" />
                ) : isDone ? (
                  <Check size={14} color="white" />
                ) : (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: isActive ? "white" : "#A8BCCF"
                    }}
                  />
                )}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 400,
                  color: isFuture ? "#7A92A8" : "#0A1628",
                  marginTop: 6,
                  whiteSpace: "nowrap"
                }}
              >
                {stage}
              </span>
            </div>

            {i < STAGES.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  backgroundColor: i < activeIndex ? "#FF6200" : "#E8EEF4",
                  margin: "0 4px",
                  marginBottom: 18
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
