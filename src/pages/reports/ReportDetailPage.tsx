import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useReport } from '@/hooks/useReports';
import ReportDownloadButtons from '@/components/reports/ReportDownloadButtons';
import ReportPreview from '@/components/reports/ReportPreview';
import Spinner from '@/components/reports/Spinner';
import type { ReportView } from '@/types/report';
import { formatDateTime, httpStatus } from './reportFormat';

const VIEWS: { view: ReportView; label: string; hint: string }[] = [
  { view: 'technical', label: 'Vista técnica', hint: 'Detalle completo: políticas, hallazgos, evidencia y trazabilidad' },
  { view: 'executive', label: 'Vista ejecutiva', hint: 'Solo métricas y recomendaciones, sin fragmentos de código' },
];

const STATUS_LABELS: Record<string, string> = { GENERATED: 'Generado' };

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const view: ReportView = searchParams.get('view') === 'executive' ? 'executive' : 'technical';
  const { data: report, isLoading, isError, error, isFetching } = useReport(id, view);

  function selectView(next: ReportView) {
    setSearchParams(next === 'executive' ? { view: 'executive' } : {}, { replace: true });
  }

  return (
    <div className="space-y-5">
      <Link to="/reports" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Reportes
      </Link>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Spinner /> Cargando reporte...
        </div>
      )}

      {isError && <ReportError status={httpStatus(error)} />}

      {report && !isError && (
        <>
          <div className="page-header flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="page-title">Reporte de cumplimiento</h1>
                <span className="badge bg-neutral-900 text-white">{STATUS_LABELS[report.status] ?? report.status}</span>
              </div>
              <p className="page-subtitle">
                {report.metadata.repoName ?? 'Repositorio sin nombre'} · generado {formatDateTime(report.metadata.generatedAt)}
                {report.metadata.generatedBy && ` por ${report.metadata.generatedBy}`}
              </p>
            </div>
            <div role="group" aria-label="Vista del reporte" className="inline-flex rounded-lg border border-neutral-200 p-0.5 bg-white">
              {VIEWS.map((option) => (
                <button
                  key={option.view}
                  type="button"
                  aria-pressed={view === option.view}
                  title={option.hint}
                  onClick={() => selectView(option.view)}
                  className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                    view === option.view ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <section className="card p-5 space-y-3" aria-labelledby="exportaciones">
            <h2 id="exportaciones" className="text-sm font-semibold text-neutral-900">
              Exportaciones
            </h2>
            <ReportDownloadButtons report={report} />
          </section>

          <div className={isFetching ? 'opacity-60 transition-opacity' : undefined} aria-busy={isFetching}>
            <ReportPreview report={report} />
          </div>
        </>
      )}
    </div>
  );
}

function ReportError({ status }: { status: number | undefined }) {
  if (status === 403) {
    return (
      <div role="status" className="px-4 py-3 bg-neutral-50 border border-neutral-200 text-neutral-600 text-sm rounded-lg">
        Los reportes de cumplimiento están disponibles para los roles Auditor y Security Admin.
      </div>
    );
  }
  const message =
    status === 404
      ? 'El reporte no existe.'
      : status === 409
        ? 'El contenido de este reporte no coincide con su checksum: fue alterado después de generarse. No se muestra ni se puede exportar, y el incidente quedó registrado en la auditoría.'
        : 'No se pudo cargar el reporte.';
  return (
    <div role="alert" className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
      {message}
    </div>
  );
}
