import { Link, useParams } from 'react-router-dom';
import { useReport } from '@/hooks/useReports';
import ReportDownloadButtons from '@/components/reports/ReportDownloadButtons';
import Spinner from '@/components/reports/Spinner';
import { SEVERITY_COLOR_CLASSES } from '@/utils/severityColors';
import { Severity } from '@/types/enums';
import { formatDateTime, formatPercent, httpStatus } from './reportFormat';

const SEVERITIES: { key: Severity; label: string }[] = [
  { key: Severity.CRITICAL, label: 'Crítica' },
  { key: Severity.HIGH, label: 'Alta' },
  { key: Severity.MEDIUM, label: 'Media' },
  { key: Severity.LOW, label: 'Baja' },
];

const STATUS_LABELS: Record<string, string> = { GENERATED: 'Generado' };

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: report, isLoading, isError, error } = useReport(id);

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

      {isError && (
        <div
          role={httpStatus(error) === 403 ? 'status' : 'alert'}
          className={`px-4 py-3 text-sm rounded-lg border ${
            httpStatus(error) === 403
              ? 'bg-neutral-50 border-neutral-200 text-neutral-600'
              : 'bg-red-50 border-red-200 text-red-600'
          }`}
        >
          {httpStatus(error) === 403
            ? 'Los reportes de cumplimiento están disponibles para los roles Auditor y Security Admin.'
            : httpStatus(error) === 404
              ? 'El reporte no existe.'
              : 'No se pudo cargar el reporte.'}
        </div>
      )}

      {report && (
        <>
          <div className="page-header flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="page-title">Reporte de cumplimiento</h1>
                <span className="badge bg-neutral-900 text-white">{STATUS_LABELS[report.status] ?? report.status}</span>
              </div>
              <p className="page-subtitle">{report.repositoryName ?? 'Repositorio sin nombre'}</p>
            </div>
          </div>

          {!report.integrityVerified && (
            <div role="alert" className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              El checksum almacenado de este reporte no coincide con su contenido. Sus exportaciones se rechazan y el
              incidente queda registrado en la auditoría.
            </div>
          )}

          <section className="card p-5 space-y-3" aria-labelledby="exportaciones">
            <h2 id="exportaciones" className="text-sm font-semibold text-neutral-900">
              Exportaciones
            </h2>
            <ReportDownloadButtons report={report} />
          </section>

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Resumen">
            <Kpi label="Cumplimiento" value={formatPercent(report.compliancePercentage)} />
            <Kpi label="Cumplimiento ponderado" value={formatPercent(report.weightedCompliancePercentage)} />
            <Kpi label="Políticas evaluadas" value={report.policiesEvaluated ?? '—'} />
            <Kpi label="Hallazgos" value={report.totalFindings ?? '—'} />
          </section>

          {report.findingsBySeverity && (
            <section className="card p-5">
              <h2 className="text-sm font-semibold text-neutral-900 mb-3">Hallazgos por severidad</h2>
              <div className="flex flex-wrap gap-4">
                {SEVERITIES.map(({ key, label }) => (
                  <span key={key} className="flex items-center gap-2 text-sm">
                    <span className={`badge border ${SEVERITY_COLOR_CLASSES[key]}`}>{label}</span>
                    <span className="tabular-nums font-semibold">{report.findingsBySeverity?.[key] ?? 0}</span>
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="card p-5">
            <h2 className="text-sm font-semibold text-neutral-900 mb-3">Metadatos</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-[12rem_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-neutral-500">Identificador</dt>
              <dd className="font-mono text-xs break-all">{report.id}</dd>
              <dt className="text-neutral-500">Análisis</dt>
              <dd>
                {report.analysisId ? (
                  <Link to={`/analyses/${report.analysisId}/results`} className="font-mono text-xs hover:underline">
                    {report.analysisId}
                  </Link>
                ) : (
                  '—'
                )}
              </dd>
              <dt className="text-neutral-500">Generado</dt>
              <dd>
                {formatDateTime(report.generatedAt)}
                {report.generatedBy && <span className="text-neutral-500"> por {report.generatedBy}</span>}
              </dd>
              <dt className="text-neutral-500">Checksum SHA-256</dt>
              <dd className="font-mono text-xs break-all">{report.checksum}</dd>
              <dt className="text-neutral-500">Integridad</dt>
              <dd>{report.integrityVerified ? 'Verificada' : 'El contenido no coincide con el checksum'}</dd>
            </dl>
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-5">
      <div className="text-2xl font-bold tabular-nums text-neutral-900">{value}</div>
      <div className="text-xs text-neutral-500 mt-1">{label}</div>
    </div>
  );
}
