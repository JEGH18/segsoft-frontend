export type ReportExportFormat = 'pdf';

export interface ReportResponse {
  id: string;
  analysisId: string;
  status: 'GENERATED';
  checksum: string;
  generatedAt: string;
}

export interface ExportedReportFile {
  blob: Blob;
  fileName: string;
}
