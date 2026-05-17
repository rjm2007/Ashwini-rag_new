"use client";

import { useEffect, useState } from "react";
import api from "../../../lib/api";
import Link from "next/link";

export default function ReviewPage() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    // This function loads pending review queue for current role.
    api.get("/review/pending").then((response) => setItems(response.data)).catch(() => setItems([]));
  }, []);

  return (
    <main>
      <h1 className="mb-4 text-xl font-semibold">Review Queue</h1>
      <div className="space-y-2">
        {items.map((item) => (
          <Link key={item.documentId} href={`/review/${item.documentId}`} className="block rounded bg-white p-3 shadow">
            Document {item.documentId} - {item.finalStatus}
          </Link>
        ))}
      </div>
    </main>
  );
}
