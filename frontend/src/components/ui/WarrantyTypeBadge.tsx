export default function WarrantyTypeBadge({ warrantyType }: { warrantyType?: string }) {
  const isNonStandard = warrantyType === "non_standard";
  return (
    <span
      title={
        isNonStandard
          ? "Non-Standard — this Make/Model/Year already has a standard warranty on file; this one is tied to a specific VIN/Chassis and may be extended or customized."
          : "Standard — the baseline warranty for this Make/Model/Year."
      }
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 10px",
        borderRadius: 999,
        color: isNonStandard ? "#D97706" : "#4F46E5",
        background: isNonStandard ? "#D9770626" : "#4F46E526"
      }}
    >
      {isNonStandard ? "Non-Standard" : "Standard"}
    </span>
  );
}
