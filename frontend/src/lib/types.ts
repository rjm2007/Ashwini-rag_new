export interface DocumentItem {
  id: string;
  originalFilename: string;
  currentRepository: string;
  processingStatus: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  evidenceJson?: unknown[];
  confidenceScore?: number;
}
