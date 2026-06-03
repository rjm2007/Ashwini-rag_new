export default function CertifyGate({
  processingStatus,
  isAdmin,
  act2Started,
  onCertify
}: {
  processingStatus: string;
  isAdmin: boolean;
  act2Started: boolean;
  onCertify?: () => void;
}) {
  let label = "Certified";
  let clickable = false;

  if (processingStatus === "awaiting_certification") {
    if (isAdmin) {
      label = "Certify to continue →";
      clickable = true;
    } else {
      label = "Awaiting admin certification";
    }
  } else if (act2Started && processingStatus !== "processing_complete") {
    label = "Certified · Act 2 running";
  } else if (act2Started || processingStatus === "processing_complete") {
    label = "Certified";
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
      <div style={{ flex: 1, height: 1, background: "var(--gate-color)", opacity: 0.4 }} />
      {clickable ? (
        <button
          type="button"
          onClick={onCertify}
          style={{
            fontSize: 11,
            fontWeight: 500,
            padding: "4px 10px",
            borderRadius: 99,
            background: "var(--gate-bg)",
            border: "1px solid var(--gate-color)",
            color: "var(--gate-color)",
            cursor: "pointer"
          }}
        >
          {label}
        </button>
      ) : (
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            padding: "4px 10px",
            borderRadius: 99,
            background: "var(--gate-bg)",
            border: "1px solid var(--gate-color)",
            color: "var(--gate-color)"
          }}
        >
          {label}
        </span>
      )}
      <div style={{ flex: 1, height: 1, background: "var(--gate-color)", opacity: 0.4 }} />
    </div>
  );
}
