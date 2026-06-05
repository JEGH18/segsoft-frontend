import SeverityBadge from '@/components/common/SeverityBadge';
import type { FindingDetailResponse } from '@/types/analysis';

interface Props {
  detail: FindingDetailResponse | null;
  loading: boolean;
  onClose: () => void;
}

export default function FindingDetailPanel({ detail, loading, onClose }: Props) {
  if (!detail && !loading) {
    return null;
  }

  return (
    <aside aria-label="Detalle de finding" className="card p-5 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-neutral-900">Detalle del finding</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar detalle de finding"
          className="btn-ghost text-xs px-2 py-1"
        >
          Cerrar ✕
        </button>
      </div>

      {loading && (
        <p className="text-sm text-neutral-500">Cargando detalle...</p>
      )}

      {detail && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-0.5">Política</p>
              <p className="text-neutral-900">{detail.policyName ?? 'Sin política'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-0.5">Framework</p>
              <p className="text-neutral-700">{detail.framework ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-0.5">Control</p>
              <p className="font-mono text-xs text-neutral-700">{detail.controlId ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-0.5">Categoría</p>
              <p className="text-neutral-700">{detail.category}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-0.5">Tipo de regla</p>
              <p className="text-neutral-700">{detail.ruleType ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-0.5">Severidad</p>
              <SeverityBadge severity={detail.severity} />
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-0.5">Archivo</p>
              <p className="font-mono text-xs text-neutral-700 break-all">{detail.filePath}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-0.5">Línea</p>
              <p className="font-mono text-xs text-neutral-700">{detail.lineNumber ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-0.5">CWE</p>
              <p className="font-mono text-xs text-neutral-700">{detail.cweId ?? '-'}</p>
            </div>
          </div>

          {detail.suggestedAction && (
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-1">Acción sugerida</p>
              <p className="text-sm text-neutral-700">{detail.suggestedAction}</p>
            </div>
          )}

          {detail.evidenceSnippet && (
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-1">Evidencia</p>
              <pre className="bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 text-xs font-mono text-neutral-700 whitespace-pre-wrap overflow-x-auto">
                {detail.evidenceSnippet}
              </pre>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
