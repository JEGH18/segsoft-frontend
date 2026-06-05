import type { AnalysisStatus, Severity } from '@/types/enums';

export type PolicyComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'REQUIRES_REVIEW';

export interface AnalysisSummary {
  id: string;
  repositoryId: string;
  status: AnalysisStatus;
  rulesExecuted: number;
  rulesTotal: number;
  progress: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  errorMessage: string | null;
}

export interface FindingListItem {
  id: string;
  policyId: string | null;
  policyName: string | null;
  ruleId: string | null;
  severity: Severity;
  category: string;
  filePath: string;
  lineNumber: number | null;
  evidenceSnippet: string | null;
  fileSha256: string | null;
  cweId: string | null;
  suggestedAction: string | null;
}

export interface PolicyResultItem {
  policyId: string;
  status: PolicyComplianceStatus;
  findingsCount: number;
  highOrCriticalCount: number;
  lowOrMediumCount: number;
}

export interface RuleExecutionErrorItem {
  id: string;
  policyId: string | null;
  ruleId: string | null;
  errorCode: string;
  message: string;
  filePath: string | null;
}

export interface AnalysisResultsResponse {
  analysis: AnalysisSummary;
  findings: FindingListItem[];
  policyResults: PolicyResultItem[];
  ruleExecutionErrors: RuleExecutionErrorItem[];
  compliancePercentage: number;
  categoryBreakdown: Record<string, number>;
}

export interface FindingsPageResponse {
  content: FindingListItem[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface FindingDetailResponse {
  id: string;
  analysisId: string;
  policyId: string | null;
  policyName: string | null;
  framework: string | null;
  controlId: string | null;
  category: string;
  ruleType: string | null;
  filePath: string;
  lineNumber: number | null;
  evidenceSnippet: string | null;
  cweId: string | null;
  severity: Severity;
  suggestedAction: string | null;
}

export interface FindingsFilters {
  severities: Severity[];
  categories: string[];
  policyId: string;
}
