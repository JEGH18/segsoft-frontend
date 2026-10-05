import { useCallback, useRef, useState } from 'react';
import { exportReport } from '@/api/reports';
import type { ReportExportFormat } from '@/types/report';
import { reportErrorMessage, saveFile } from '@/utils/reportDownload';

export interface CompletedDownload {
  format: ReportExportFormat;
  fileName: string;
  cache: 'HIT' | 'MISS' | null;
}

/**
 * Downloads report exports one request per format at a time: a second click
 * on a format that is still downloading is ignored instead of sending a
 * duplicate request.
 */
export function useReportDownload(reportId: string) {
  const [pending, setPending] = useState<ReportExportFormat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<CompletedDownload | null>(null);
  const inFlight = useRef(new Set<ReportExportFormat>());

  const download = useCallback(
    async (format: ReportExportFormat) => {
      if (inFlight.current.has(format)) return;
      inFlight.current.add(format);
      setPending((current) => [...current, format]);
      setError(null);
      setCompleted(null);
      try {
        const file = await exportReport(reportId, format);
        saveFile(file.blob, file.fileName);
        setCompleted({ format, fileName: file.fileName, cache: file.cache });
      } catch (err) {
        setError(await reportErrorMessage(err));
      } finally {
        inFlight.current.delete(format);
        setPending((current) => current.filter((f) => f !== format));
      }
    },
    [reportId],
  );

  return {
    download,
    isDownloading: (format: ReportExportFormat) => pending.includes(format),
    error,
    completed,
  };
}
