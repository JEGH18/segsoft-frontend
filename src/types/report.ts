export type ReportExportFormat = 'pdf' | 'sarif';

export type ReportStatus = 'GENERATED';

export interface ReportResponse {
  id: string;
  analysisId: string;
  status: ReportStatus;
  checksum: string;
  generatedAt: string;
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
