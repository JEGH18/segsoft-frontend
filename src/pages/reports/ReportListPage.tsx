import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useReports } from '@/hooks/useReports';
import Spinner from '@/components/reports/Spinner';
import { formatDateTime, formatPercent, httpStatus } from './reportFormat';

export default function ReportListPage() {
  const [page, setPage] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const repositoryId = searchParams.get('repositoryId') ?? undefined;
  const { data, isLoading, isError, error } = useReports(page, { repositoryId });

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Reportes de cumplimiento</h1>
        <p className="page-subtitle">
          Reportes congelados a partir de análisis completados. Ábrelos para descargarlos en PDF o SARIF.
        </p>
      </div>

      {repositoryId && (
        <div className="flex items-center gap-2 text-sm">
          <span className="badge bg-neutral-100 text-neutral-700">
            Histórico de un repositorio{data?.content[0]?.repositoryName ? `: ${data.content[0].repositoryName}` : ''}
          </span>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setPage(0);
              setSearchParams({});
            }}
          >
            Ver todos
          </button>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Spinner /> Cargando reportes...
        </div>
      )}

      {isError && httpStatus(error) === 403 && (
        <div role="status" className="px-4 py-3 bg-neutral-50 border border-neutral-200 text-neutral-600 text-sm rounded-lg">
          Los reportes de cumplimiento están disponibles para los roles Auditor y Security Admin.
        </div>
      )}
      {isError && httpStatus(error) !== 403 && (
        <div role="alert" className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
          No se pudieron cargar los reportes.
        </div>
      )}

      {data && data.content.length === 0 && (
        <div className="card p-10 text-center text-sm text-neutral-500">
          Aún no hay reportes. Genera uno desde los resultados de un análisis completado.
        </div>
      )}

      {data && data.content.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="table-th">Repositorio</th>
                  <th className="table-th">Generado</th>
                  <th className="table-th">Por</th>
                  <th className="table-th text-right">Cumplimiento</th>
                  <th className="table-th text-right">Hallazgos</th>
                  <th className="table-th">Integridad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.content.map((report) => (
                  <tr key={report.id} className="hover:bg-neutral-50">
                    <td className="table-td">
                      <Link to={`/reports/${report.id}`} className="font-medium text-neutral-900 hover:underline">
                        {report.repositoryName ?? 'Reporte sin nombre'}
                      </Link>
                      <div className="font-mono text-xs text-neutral-400">{report.id}</div>
                    </td>
                    <td className="table-td whitespace-nowrap">{formatDateTime(report.generatedAt)}</td>
                    <td className="table-td">{report.generatedBy ?? '—'}</td>
                    <td className="table-td text-right tabular-nums">{formatPercent(report.compliancePercentage)}</td>
                    <td className="table-td text-right tabular-nums">{report.totalFindings ?? '—'}</td>
                    <td className="table-td">
                      {report.integrityVerified ? (
                        <span className="badge bg-green-100 text-green-700">Verificada</span>
                      ) : (
                        <span className="badge bg-red-100 text-red-700">Alterado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 text-sm">
              <button type="button" className="btn-ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>
                Anterior
              </button>
              <span className="text-neutral-500">
                Página {page + 1} de {data.totalPages}
              </span>
              <button
                type="button"
                className="btn-ghost"
                disabled={page + 1 >= data.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
