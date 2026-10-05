import { useQuery } from '@tanstack/react-query';
import { getReport, listReports } from '@/api/reports';

export function useReports(page: number, size = 20) {
  return useQuery({
    queryKey: ['reports', page, size],
    queryFn: () => listReports(page, size),
    retry: false,
  });
}

export function useReport(reportId: string | undefined) {
  return useQuery({
    queryKey: ['report', reportId],
    queryFn: () => getReport(reportId as string),
    enabled: !!reportId,
    retry: false,
  });
}
