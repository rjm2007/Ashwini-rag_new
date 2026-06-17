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
  metadataJson?: Record<string, unknown>;
  confidenceScore?: number;
  errorMessage?: string;
  requiredFieldsMissing?: boolean;
  completeness?: number;
  aiSummaryText?: string | null;
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
  stats?: WarrantySummaryStats;
  coverage_components?: CoverageComponent[];
  document?: Record<string, unknown>;
  warranty_program?: Record<string, unknown>;
  asset_context?: Record<string, unknown>;
  applicability?: Record<string, unknown>;
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

export interface WarrantyDocumentSchema {
  coverage_components?: CoverageComponent[];
  applicability?: { make?: string; models?: string[] };
  document?: { document_type?: string };
}

export type QueryResponseType =
  | "answer"
  | "disambiguation"
  | "needs_eligibility"
  | "decision"
  | "coverage_list";

export interface QueryContext {
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
