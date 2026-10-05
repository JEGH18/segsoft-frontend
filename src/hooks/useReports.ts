import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getReport, listReports, type ReportHistoryFilter } from '@/api/reports';
import type { ReportView } from '@/types/report';

export function useReports(page: number, filter: ReportHistoryFilter = {}, size = 20) {
  return useQuery({
    queryKey: ['reports', page, size, filter.repositoryId ?? null, filter.analysisId ?? null],
    queryFn: () => listReports(page, size, filter),
    retry: false,
  });
}

export function useReport(reportId: string | undefined, view: ReportView) {
  return useQuery({
    queryKey: ['report', reportId, view],
    queryFn: () => getReport(reportId as string, view),
    enabled: !!reportId,
    retry: false,
    // Switching views keeps the current one on screen until the other arrives.
    placeholderData: keepPreviousData,
  });
}
