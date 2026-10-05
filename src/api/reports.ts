import axiosInstance from '@/utils/axiosInstance';
import type {
  ExportedReportFile,
  ReportExportFormat,
  ReportPage,
  ReportResponse,
  ReportView,
  StructuredReport,
} from '@/types/report';

export async function generateReport(analysisId: string): Promise<ReportResponse> {
  const { data } = await axiosInstance.post<ReportResponse>(`/api/v1/analyses/${analysisId}/reports`);
  return data;
}

export interface ReportHistoryFilter {
  repositoryId?: string;
  analysisId?: string;
}

export async function listReports(page = 0, size = 20, filter: ReportHistoryFilter = {}): Promise<ReportPage> {
  const { data } = await axiosInstance.get<ReportPage>('/api/v1/reports', {
    params: {
      page,
      size,
      ...(filter.repositoryId ? { repositoryId: filter.repositoryId } : {}),
      ...(filter.analysisId ? { analysisId: filter.analysisId } : {}),
    },
  });
  return data;
}

export async function getReport(reportId: string, view: ReportView = 'technical'): Promise<StructuredReport> {
  const { data } = await axiosInstance.get<StructuredReport>(`/api/v1/reports/${reportId}`, { params: { view } });
  return data;
}

export async function exportReport(
  reportId: string,
  format: ReportExportFormat = 'pdf',
): Promise<ExportedReportFile> {
  const response = await axiosInstance.get<Blob>(`/api/v1/reports/${reportId}/export`, {
    params: { format },
    responseType: 'blob',
  });
  const disposition = response.headers['content-disposition'] as string | undefined;
  const cache = (response.headers['x-cache'] as string | undefined)?.toUpperCase();
  return {
    blob: response.data,
    fileName: fileNameFromDisposition(disposition) ?? `segsoft-report-${reportId}.${format}`,
    cache: cache === 'HIT' || cache === 'MISS' ? cache : null,
  };
}

export function fileNameFromDisposition(disposition: string | undefined): string | null {
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  return match ? match[1] : null;
}
