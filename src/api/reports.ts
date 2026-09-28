import axiosInstance from '@/utils/axiosInstance';
import type { ExportedReportFile, ReportExportFormat, ReportResponse } from '@/types/report';

export async function generateReport(analysisId: string): Promise<ReportResponse> {
  const { data } = await axiosInstance.post<ReportResponse>('/api/v1/reports', { analysisId });
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
  return {
    blob: response.data,
    fileName: fileNameFromDisposition(disposition) ?? `segsoft-report-${reportId}.${format}`,
  };
}

function fileNameFromDisposition(disposition: string | undefined): string | null {
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  return match ? match[1] : null;
}
