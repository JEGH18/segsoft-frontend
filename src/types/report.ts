export type ReportExportFormat = 'pdf' | 'sarif';

export type ReportStatus = 'GENERATED';

export interface ReportResponse {
  id: string;
  analysisId: string;
  status: ReportStatus;
  checksum: string;
  generatedAt: string;
  /** Also sent as the Location header of POST /api/v1/analyses/{id}/reports. */
  url: string;
}

/** What the download buttons need from a report, whichever endpoint it came from. */
export interface DownloadableReport {
  id: string;
  status: ReportStatus;
  exportFormats: string[];
}

export type ReportView = 'technical' | 'executive';
export type SeverityKey = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'REQUIRES_REVIEW';

export interface ReportFinding {
  findingId: string | null;
  policyId: string | null;
  policyName: string | null;
  ruleId: string | null;
  severity: SeverityKey;
  category: string;
  cweId: string | null;
  filePath: string;
  lineNumber: number | null;
  evidenceSnippet: string | null;
  suggestedAction: string | null;
}

export interface ReportPolicyResult {
  policyId: string;
  name: string | null;
  category: string | null;
  framework: string | null;
  controlId: string | null;
  weight: number | null;
  status: ComplianceStatus;
  findingsCount: number;
  highOrCriticalCount: number;
  lowOrMediumCount: number;
}

export interface ReportRecommendation {
  priority: number;
  policyId: string | null;
  policyName: string | null;
  category: string | null;
  status: ComplianceStatus;
  highestSeverity: SeverityKey | null;
  findings: number;
  highOrCriticalFindings: number;
  action: string;
}

export interface CoverageCounts {
  policiesEvaluated: number;
  compliantPolicies: number;
  nonCompliantPolicies: number;
  requiresReviewPolicies: number;
  findings: number;
  highOrCriticalFindings: number;
  /** Null when nothing was evaluated (no coverage). */
  compliancePercentage: number | null;
}

/** GET /api/v1/reports/{id}?view=technical|executive */
export interface StructuredReport {
  id: string;
  status: ReportStatus;
  view: ReportView;
  schemaVersion: number;
  checksum: string;
  integrityVerified: boolean;
  exportFormats: string[];
  metadata: {
    reportId: string;
    analysisId: string | null;
    repositoryId: string | null;
    repoName: string | null;
    sourceType: string | null;
    branch: string | null;
    generatedAt: string;
    generatedBy: string | null;
    analysisStartedAt: string | null;
    analysisCompletedAt: string | null;
    rulesExecuted: number;
    rulesTotal: number;
  };
  executiveSummary: {
    compliancePercentage: number | null;
    weightedCompliancePercentage: number | null;
    totalPolicies: number;
    compliantPolicies: number;
    nonCompliantPolicies: number;
    requiresReviewPolicies: number;
    totalFindings: number;
    highOrCriticalFindings: number;
    highestSeverity: SeverityKey | null;
    ruleExecutionErrors: number;
    recommendations: ReportRecommendation[];
  };
  /** Technical view only. */
  policyResults?: ReportPolicyResult[];
  /** findings is only present in the technical view. */
  findingsBySeverity: Record<SeverityKey, { count: number; findings?: ReportFinding[] }>;
  claudeCodeSecurityCoverage: (CoverageCounts & { category: string })[];
  frameworkCoverage: (CoverageCounts & {
    framework: string;
    /** Technical view only. */
    controls?: { controlId: string; status: ComplianceStatus; policyIds: string[] }[];
  })[];
  traceabilityReference: {
    self: string;
    executiveView: string;
    technicalView: string;
    repositoryHistory?: string;
    analysis?: string;
    analysisResults?: string;
    analysisFindings?: string;
    findingDetailTemplate: string;
    exports: Record<string, string>;
    policies: { policyId: string; policyName: string | null; policy: string; traceability: string }[];
  };
}

/** GET /api/v1/reports/{id} and each row of GET /api/v1/reports. */
export interface ReportSummary {
  id: string;
  analysisId: string | null;
  status: ReportStatus;
  checksum: string;
  generatedAt: string;
  generatedBy: string | null;
  repositoryName: string | null;
  compliancePercentage: number | null;
  weightedCompliancePercentage: number | null;
  policiesEvaluated: number | null;
  totalFindings: number | null;
  findingsBySeverity: Record<string, number> | null;
  /** False when the stored checksum no longer matches the content: exports answer 409. */
  integrityVerified: boolean;
  exportFormats: string[];
}

export interface ReportPage {
  content: ReportSummary[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface ExportedReportFile {
  blob: Blob;
  fileName: string;
  /** X-Cache response header: whether the server reused a cached file. */
  cache: 'HIT' | 'MISS' | null;
}
