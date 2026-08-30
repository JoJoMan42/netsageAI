export type Severity = "High" | "Medium" | "Low";
export type Decision = "Accepted" | "Edited" | "Rejected";
export type OSILayer = "Layer 1" | "Layer 2" | "Layer 3" | "Layer 4" | "Layer 7";
export type Confidence = "high" | "medium" | "low";

export interface CaseItem {
  case_id: string;
  issue_type: string;
  symptom: string;
  topology_note: string;
  show_output: string;
  expected_fault: string;
  osi_layer: OSILayer | string;
  concept_tag: string;
  severity: Severity | string;
}

export interface ReviewItem {
  case_id: string;
  ai_root_cause: string;
  ai_confidence: Confidence | string;
  ai_osi_layer: OSILayer | string;
  human_decision: Decision | string;
  final_root_cause: string;
  correction_reason: string;
  reviewer_notes: string;
}

export interface RuleFlag {
  rule: string;
  message: string;
  severity: "high" | "medium" | "low";
  details?: Record<string, any>;
}

export interface CheckResult {
  case_id: string;
  flags: RuleFlag[];
  passed: boolean;
}

export interface AIDiagnosisResult {
  root_cause: string;
  confidence: "high" | "medium" | "low";
  evidence: string[];
  osi_layer: "Layer 1" | "Layer 2" | "Layer 3" | "Layer 4" | "Layer 7";
  next_command: string;
  fix_steps: string[];
  raw_response?: string;
  mode?: "mock" | "gemini" | "custom";
}

export interface AnalyticsSummary {
  totalCases: number;
  totalReviews: number;
  acceptedCount: number;
  editedCount: number;
  rejectedCount: number;
  agreementRate: number;
  issueTypeBreakdown: { type: string; count: number }[];
  severityBreakdown: { severity: string; count: number }[];
  decisionBreakdown: { decision: string; count: number }[];
  osiLayerBreakdown: { layer: string; count: number }[];
  correctionReasonBreakdown: { reason: string; count: number }[];
}
