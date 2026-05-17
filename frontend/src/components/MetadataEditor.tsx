"use client";

import { useState } from "react";

export default function MetadataEditor({ document }: { document: any }) {
  const [metadata, setMetadata] = useState(document?.metadataJson || {});

  const onChange = (key: string, value: string) => {
    // This function updates metadata editor local state.
    setMetadata((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-2">
      <input
        className="w-full rounded border p-2"
        placeholder="Make"
        value={metadata.make || ""}
        onChange={(event) => onChange("make", event.target.value)}
      />
      <input
        className="w-full rounded border p-2"
        placeholder="Model"
        value={metadata.model || ""}
        onChange={(event) => onChange("model", event.target.value)}
      />
      <input
        className="w-full rounded border p-2"
        placeholder="Year"
        value={metadata.year || ""}
        onChange={(event) => onChange("year", event.target.value)}
      />
    </div>
  );
}
