export interface DocumentItem {
  id: string;
  originalFilename: string;
  currentRepository: string;
  processingStatus: string;
  documentType?: string;
  uploadedAt?: string;
  coverageCount?: number;
  masterSchemaJson?: WarrantyDocumentSchema;
}

export interface DocumentDetail extends DocumentItem {
  make?: string;
  model?: string;
  year?: number;
  warrantyType?: string;
  metadataJson?: Record<string, unknown>;
  confidenceScore?: number;
  errorMessage?: string;
  requiredFieldsMissing?: boolean;
  completeness?: number;
  aiSummaryText?: string | null;
  assetPurchaseDate?: string | null;
  assetCurrentMileage?: number | null;
}

export interface PipelineEvent {
  id: string;
  document_id?: string;
  documentId?: string;
  act: 1 | 2;
  stage: string;
  step_key: string;
  step_label: string;
  status: "running" | "done" | "failed" | "idle";
  detail: Record<string, unknown>;
  duration_ms: number | null;
  sequence: number;
  created_at: string;
}

export type FieldStatus = "extracted" | "missing" | "low_confidence" | "not_applicable";

export interface FieldWrapper {
  value: string | number | boolean | null;
  status: FieldStatus;
  confidence: number;
  page?: number | null;
}

export interface MasterSchema {
  document: Record<string, FieldWrapper>;
  vehicle: Record<string, FieldWrapper>;
  profiles: {
    warranty_certificate?: WarrantyCertificateProfile;
    coverage_code_table?: CoverageCodeTableProfile;
    repair_invoice?: RepairInvoiceProfile;
    insurance_policy?: Record<string, FieldWrapper>;
    generic_document?: Record<string, FieldWrapper>;
  };
  extensions?: ExtensionSection[];
  quality?: {
    fields_extracted?: number;
    fields_missing?: number;
    fields_low_confidence?: number;
    overall_completeness?: number;
  };
}

export interface ExtensionSection {
  section_id?: string;
  label?: string;
  heading?: string;
  summary?: string;
  raw_fields?: Record<string, FieldWrapper>;
  page?: number;
}

export interface WarrantyCertificateProfile {
  coverage_summary?: Record<string, FieldWrapper>;
  covered_components?: Array<Record<string, FieldWrapper>>;
  exclusions?: Array<{ clause_no?: FieldWrapper; title?: FieldWrapper; text?: FieldWrapper }>;
  towing?: Record<string, FieldWrapper>;
}

export interface CoverageCodeTableProfile {
  coverage_codes?: Array<Record<string, FieldWrapper>>;
}

export interface RepairInvoiceProfile {
  invoice_no?: FieldWrapper;
  ro_no?: FieldWrapper;
  invoice_date?: FieldWrapper;
  customer?: FieldWrapper;
  complaint?: FieldWrapper;
  correction?: FieldWrapper;
  line_items?: Array<Record<string, FieldWrapper>>;
  totals?: Record<string, FieldWrapper>;
}

export interface SummaryPayload {
  documentId: string;
  filename: string;
  documentType?: string | null;
  completeness?: number;
  requiredFieldsMissing?: boolean;
  warrantyType?: string;
  stats?: WarrantySummaryStats;
  coverage_components?: CoverageComponent[];
  document?: Record<string, unknown>;
  warranty_program?: { program_name?: string; [key: string]: unknown };
  asset_context?: Record<string, unknown>;
  applicability?: { make?: string; models?: string[]; [key: string]: unknown };
  general_conditions?: Array<Record<string, unknown>>;
  general_exclusions?: Array<Record<string, unknown>>;
}

export type WarrantySummaryPayload = SummaryPayload;

export interface WarrantySummaryStats {
  coverage_count: number;
  with_time_limit?: number;
  with_mileage_limit?: number;
  with_limit_of_liability?: number;
  with_deductible?: number;
  extraction_confidence?: number | null;
}

export interface CoverageComponent {
  coverage_id: string;
  coverage_name: string;
  coverage_type?: string;
  coverage_hierarchy?: {
    system?: string | null;
    subsystem?: string | null;
    component_group?: string | null;
    component?: string | null;
  };
  coverage_period?: {
    duration_text?: string;
    duration_months?: number | null;
    mileage_limit?: number | null;
    mileage_unit?: string | null;
  };
  limit_of_liability?: { amount?: number; currency?: string };
  deductible?: { amount?: number; currency?: string };
  plan_tier?: string | null;
  confidence_score?: number;
}

export interface CoverageListItem extends Partial<CoverageComponent> {
  coverage_id: string;
  coverage_name: string;
  period_label?: string | null;
  eligibility_hint?: string | null;
  documentId?: string;
}

export interface WarrantyDocumentSchema {
  coverage_components?: CoverageComponent[];
  applicability?: { make?: string; models?: string[] };
  document?: { document_type?: string; extraction_confidence?: number };
  quality?: MasterSchema["quality"];
  profiles?: MasterSchema["profiles"];
  vehicle?: MasterSchema["vehicle"];
}

/** Legacy FIELD_WRAPPER schema or WARR-1172 flat schema */
export type DocumentMasterSchema = MasterSchema | WarrantyDocumentSchema;

export type QueryResponseType =
  | "answer"
  | "disambiguation"
  | "needs_eligibility"
  | "decision"
  | "coverage_list"
  | "multi_decision";

export interface QueryContext {
  documentId?: string;
  make?: string;
  model?: string;
  year?: number;
  selectedCoverageId?: string;
  eligibility?: {
    purchase_date?: string;
    current_mileage?: string | number;
  };
}

export interface ChatMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  evidenceJson?: Array<EvidencePayload>;
  confidenceScore?: number;
  metadataFiltersAppliedJson?: Record<string, unknown>;
  coverageDecision?: CoverageDecision;
  responseType?: QueryResponseType;
  costUsd?: number;
}

/**
 * Raw Qdrant chunk payload returned by the AI service.
 * Old stored messages may use 'text'/'page'; new ones use 'chunkText'/'pageNumber'.
 */
export interface EvidencePayload {
  chunkText?: string;
  pageNumber?: number;
  sectionHeading?: string;
  documentId?: string;
  chunkType?: string;
  filename?: string;
  // backwards compat with older stored messages:
  text?: string;
  page?: number;
}

export type CoverageDecision =
  | "covered"
  | "not_covered"
  | "partial"
  | "insufficient_evidence"
  | "answered"
  | "not_in_document"
  | "needs_clarification"
  | "covered_with_limits";

export type ConfidenceBand = "high" | "medium" | "low";

export interface ClauseEligibility {
  make_match?: boolean;
  model_match?: boolean;
  model_year_match?: boolean;
  time_eligible?: boolean;
  mileage_eligible?: boolean;
  duration_months?: number;
  warranty_mileage_limit?: number;
  current_mileage?: number;
  purchase_date?: string;
  warranty_expiration_date?: string;
}

export interface ClauseResult {
  rank: number;
  coverage_id?: string;
  warranty_heading: string;
  context_confidence_score: number;
  matched_context_summary: string;
  why_matched: string;
  page_number?: number;
  chunk_id?: string;
  decision: "COVERED" | "POSSIBLY_COVERED" | "NOT_COVERED" | "INFORMATION_ONLY";
  asset_eligibility: ClauseEligibility;
  explanation: string;
}

export interface MultiDecisionResponse {
  responseType: "multi_decision";
  request_id: string;
  primary_decision: "COVERED" | "POSSIBLY_COVERED" | "NOT_COVERED" | "INFORMATION_ONLY";
  overall_confidence_score: number;
  defect_interpretation: Record<string, unknown>;
  asset: Record<string, unknown>;
  exclusions_checked: Array<Record<string, unknown>>;
  clause_results: ClauseResult[];
  user_message: string;
  coverageDecision?: string;
  answer?: string;
  confidence?: number;
  filters?: Record<string, unknown>;
  context?: QueryContext;
}

export interface DefectMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  evidenceJson?: Record<string, unknown>;
  confidenceScore?: number;
  createdAt?: string;
}

export interface Defect {
  id: string;
  documentId: string;
  createdBy: string;
  reportedDefect: string;
  warrantyType?: string;
  purchaseDate?: string;
  currentMileage?: number;
  make?: string;
  model?: string;
  year?: number;
  primaryDecision?: string;
  primaryComponent?: string;
  primaryCoverageId?: string;
  overallConfidenceScore?: number;
  contextJson?: Record<string, unknown>;
  createdAt?: string;
  messages?: DefectMessage[];
}

export interface EligibleVehicleOption {
  documentId: string;
  originalFilename: string;
  warrantyType?: string;
  vinSuffix?: string | null;
}

export interface EligibleVehicleGroup {
  make: string;
  model: string;
  year: number | null;
  vehicles: EligibleVehicleOption[];
}

export type CallLogStatus = "in_progress" | "completed" | "failed";

export interface CallLog {
  id: string;
  vapiCallId?: string;
  agentKey: string;
  agentName?: string;
  createdBy?: string;
  createdByEmail?: string;
  status: CallLogStatus;
  eventDescription?: string;
  summary?: string;
  recommendation?: string;
  documentsCollected: string[];
  documentsPending: string[];
  transcript?: string;
  transcriptMessagesJson: Array<{ role: string; message: string }>;
  endedReason?: string;
  startedAt: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}
