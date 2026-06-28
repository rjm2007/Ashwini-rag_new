import axios from "axios";
import type { PipelineEvent, QueryContext, SummaryPayload, Defect, EligibleVehicleGroup, DefectMessage } from "./types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
});

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && error?.response?.status === 401) {
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export const getDocumentEvents = (docId: string) =>
  api.get<PipelineEvent[]>(`/documents/${docId}/events`);

export const getDocumentSummary = (docId: string) =>
  api.get<SummaryPayload>(`/documents/${docId}/summary`);

export const certifyDocument = (docId: string) =>
  api.post(`/review/${docId}/admin-approve`, { comment: "Certified via UI" });

export const patchReviewMetadata = (docId: string, data: Record<string, unknown>) =>
  api.patch(`/review/${docId}/metadata`, data);

export const raiseQuery = (payload: {
  documentId?: string;
  sessionId?: string;
  question?: string;
  answerSnapshot?: string;
}) => api.post("/support/tickets", payload);

export const createChatSession = (documentFilename: string) =>
  api.post("/query/sessions", { title: documentFilename });

export const getChatSession = (sessionId: string) =>
  api.get(`/query/sessions/${sessionId}`);

export const sendChatMessage = (
  sessionId: string,
  content: string,
  documentId?: string,
  context?: QueryContext | Record<string, unknown>
) => api.post(`/query/sessions/${sessionId}/messages`, { content, documentId, context });

export const getDocumentCost = (docId: string) => api.get(`/cost/document/${docId}`);
export const getDailyCost = () => api.get("/cost/daily");

export const createDefect = (documentId: string, reportedDefect: string, purchaseDate?: string, currentMileage?: number) =>
  api.post("/defects", { documentId, reportedDefect, purchaseDate, currentMileage });

export const getEligibleDefectDocuments = () =>
  api.get<EligibleVehicleGroup[]>("/defects/eligible-documents");

export const getDefects = () =>
  api.get<Defect[]>("/defects");

export const getDefect = (id: string) =>
  api.get<Defect>(`/defects/${id}`);

export const sendDefectMessage = (id: string, content: string) =>
  api.post(`/defects/${id}/messages`, { content });

export default api;
