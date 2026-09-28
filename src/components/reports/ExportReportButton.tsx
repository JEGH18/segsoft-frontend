import { useState } from 'react';
import { AxiosError } from 'axios';
import { exportReport, generateReport } from '@/api/reports';
import { useAuth } from '@/store/authStore';
import { AnalysisStatus } from '@/types/enums';
import type { ReportResponse } from '@/types/report';

const EXPORT_ROLES = ['AUDITOR', 'SECURITY_ADMIN'];

interface ExportReportButtonProps {
  analysisId: string;
  analysisStatus: AnalysisStatus;
}

/**
 * Freezes the analysis into a compliance report (first click only) and
 * downloads it as PDF. Only AUDITOR and SECURITY_ADMIN can export, matching
 * the backend's @PreAuthorize; for anyone else the button is not rendered.
 */
export default function ExportReportButton({ analysisId, analysisStatus }: ExportReportButtonProps) {
  const { user } = useAuth();
  // Reused on later clicks so re-downloading does not create a new report each time.
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadedFile, setDownloadedFile] = useState<string | null>(null);

  const canExport = user?.roles.some((role) => EXPORT_ROLES.includes(role)) ?? false;
  if (!canExport) return null;

  const completed = analysisStatus === AnalysisStatus.COMPLETED;

  async function handleExport() {
    setExporting(true);
    setError(null);
    setDownloadedFile(null);
    try {
      const current = report ?? (await generateReport(analysisId));
      setReport(current);
      const file = await exportReport(current.id, 'pdf');
      downloadFile(file.blob, file.fileName);
      setDownloadedFile(file.fileName);
    } catch (err) {
      setError(await exportErrorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        className="btn-primary"
        onClick={() => void handleExport()}
        disabled={!completed || exporting}
        title={completed ? undefined : 'Solo se pueden exportar análisis completados'}
      >
        {exporting ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" />
          </svg>
        )}
        {exporting ? 'Generando PDF…' : 'Exportar PDF'}
      </button>
      {error && (
        <p role="alert" className="max-w-xs text-right text-xs text-red-600">
          {error}
        </p>
      )}
      {downloadedFile && report && (
        <p role="status" className="max-w-xs text-right text-xs text-neutral-500">
          Descargado {downloadedFile}
          <span className="block font-mono" title={report.checksum}>
            SHA-256 {report.checksum.slice(0, 16)}…
          </span>
        </p>
      )}
    </div>
  );
}

function downloadFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * The export call uses responseType 'blob', so a JSON error body arrives as
 * a Blob too and has to be read before its message can be shown.
 */
async function exportErrorMessage(err: unknown): Promise<string> {
  const response = (err as AxiosError | undefined)?.response;
  switch (response?.status) {
    case 403:
      return 'No tienes permisos para exportar reportes.';
    case 409:
      return 'El reporte no superó la verificación de integridad (checksum) y no se descargó. Contacta al administrador de seguridad.';
    case 422:
      return 'Solo se pueden exportar análisis completados.';
    default: {
      const message = await backendMessage(response?.data);
      return message ?? 'No se pudo exportar el reporte. Intenta de nuevo.';
    }
  }
}

async function backendMessage(data: unknown): Promise<string | null> {
  try {
    const body = data instanceof Blob ? JSON.parse(await data.text()) : data;
    return typeof body?.message === 'string' ? body.message : null;
  } catch {
    return null;
  }
}
