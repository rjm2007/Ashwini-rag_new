const KEY = (docId: string) => `docchat:${docId}`;

export function getStoredSession(docId: string): string | null {
  return typeof window !== "undefined" ? localStorage.getItem(KEY(docId)) : null;
}

export function storeSession(docId: string, sessionId: string): void {
  localStorage.setItem(KEY(docId), sessionId);
}

export function clearSession(docId: string): void {
  localStorage.removeItem(KEY(docId));
}
