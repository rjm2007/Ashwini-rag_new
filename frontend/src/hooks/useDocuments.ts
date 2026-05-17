"use client";

import { useEffect, useState } from "react";
import api from "../lib/api";

export function useDocuments() {
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    // This function fetches document list for documents page.
    api.get("/documents").then((response) => setDocuments(response.data.data || []));
  }, []);

  return { documents };
}
