import SeverityBadge from '@/components/common/SeverityBadge';
import type { FindingListItem } from '@/types/analysis';

interface Props {
  findings: FindingListItem[];
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
  onSelectFinding: (findingId: string) => void;
}

export default function FindingsTable({
  findings,
  page,
  totalPages,
  onPageChange,
  onSelectFinding,
}: Props) {
  return (
    <section aria-label="Tabla de findings" className="space-y-3">
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="table-th">Severidad</th>
                <th className="table-th">Categoría</th>
                <th className="table-th">Política</th>
                <th className="table-th">Archivo</th>
                <th className="table-th">Línea</th>
                <th className="table-th">CWE</th>
                <th className="table-th">Acción sugerida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {findings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-neutral-500">
                    No se encontraron findings con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                findings.map((finding) => (
                  <tr
                    key={finding.id}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectFinding(finding.id);
                      }
                    }}
                    onClick={() => onSelectFinding(finding.id)}
                    className="cursor-pointer hover:bg-neutral-50 transition-colors focus:outline-none focus:bg-neutral-50"
                  >
                    <td className="table-td">
                      <SeverityBadge severity={finding.severity} />
                    </td>
                    <td className="table-td text-xs">{finding.category}</td>
                    <td className="table-td text-xs">{finding.policyName ?? '-'}</td>
                    <td className="table-td font-mono text-xs max-w-xs truncate" title={finding.filePath}>
                      {finding.filePath}
                    </td>
                    <td className="table-td tabular-nums text-xs">{finding.lineNumber ?? '-'}</td>
                    <td className="table-td font-mono text-xs">{finding.cweId ?? '-'}</td>
                    <td className="table-td text-xs max-w-xs truncate" title={finding.suggestedAction ?? ''}>
                      {finding.suggestedAction ?? '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={page === 0}
            aria-label="Ir a la página anterior"
            className="btn-outline text-xs px-3 py-1.5"
          >
            ← Anterior
          </button>
          <span className="text-xs text-neutral-500">
            Página {page + 1} de {Math.max(totalPages, 1)}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            aria-label="Ir a la página siguiente"
            className="btn-outline text-xs px-3 py-1.5"
          >
            Siguiente →
          </button>
        </div>
      )}
    </section>
  );
}
