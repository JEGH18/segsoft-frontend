import { useReportDownload } from '@/hooks/useReportDownload';
import { useAuth } from '@/store/authStore';
import type { ReportExportFormat, ReportSummary } from '@/types/report';
import Spinner from './Spinner';

const EXPORT_ROLES = ['AUDITOR', 'SECURITY_ADMIN'];

const FORMATS: { format: ReportExportFormat; label: string; hint: string }[] = [
  { format: 'pdf', label: 'Descargar PDF', hint: 'Reporte para stakeholders y archivo de auditoría' },
  { format: 'sarif', label: 'Descargar SARIF', hint: 'SARIF 2.1.0 para pipelines CI/CD (GitHub Code Scanning)' },
];

/**
 * "Descargar PDF" / "Descargar SARIF" for a report. Rendered only for
 * AUDITOR and SECURITY_ADMIN (the backend refuses everyone else) and only
 * for reports in GENERATED state.
 */
export default function ReportDownloadButtons({ report }: { report: ReportSummary }) {
  const { user } = useAuth();
  const { download, isDownloading, error, completed } = useReportDownload(report.id);

  const canExport = user?.roles.some((role) => EXPORT_ROLES.includes(role)) ?? false;
  if (!canExport || report.status !== 'GENERATED') return null;

  const formats = FORMATS.filter(({ format }) => report.exportFormats.includes(format));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {formats.map(({ format, label, hint }) => {
          const busy = isDownloading(format);
          return (
            <button
              key={format}
              type="button"
              className={format === 'pdf' ? 'btn-primary' : 'btn-outline'}
              onClick={() => void download(format)}
              disabled={busy}
              aria-busy={busy}
              title={hint}
            >
              {busy ? (
                <Spinner />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" />
                </svg>
              )}
              {busy ? `Generando ${format.toUpperCase()}…` : label}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {completed && (
        <p role="status" className="text-xs text-neutral-500">
          Descargado <span className="font-mono">{completed.fileName}</span>
          {completed.cache === 'HIT' && ' (desde caché)'}
        </p>
      )}
    </div>
  );
}
