import { useEffect } from 'react';
import type { FindingDetailResponse } from '@/types/analysis';
import { SEVERITY_HEX, SEVERITY_TEXT_ON_HEX } from '@/utils/severityColors';

interface Props {
  detail: FindingDetailResponse | null;
  loading: boolean;
  onClose: () => void;
}

const SEVERITY_LABEL_ES: Record<string, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

export default function FindingDetailPanel({ detail, loading, onClose }: Props) {
  const isOpen = loading || detail !== null;
  const accent = detail ? SEVERITY_HEX[detail.severity] : '#2a78d6';

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Detalle del finding"
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[460px] bg-[#0b0e1a] text-neutral-100 shadow-2xl transition-transform duration-300 ease-out overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Severity accent bar */}
        <div
          className="h-1 w-full transition-colors duration-300"
          style={{ background: `linear-gradient(90deg, ${accent}, transparent 150%)` }}
        />

        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-5">
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar detalle de finding"
              className="text-neutral-400 hover:text-white transition-colors -ml-1 p-1 rounded hover:bg-white/5"
            >
              ✕
            </button>

            {detail && (
              <span
                className="badge font-semibold shrink-0"
                style={{
                  backgroundColor: accent,
                  color: SEVERITY_TEXT_ON_HEX[detail.severity],
                  boxShadow: `0 0 16px 1px ${accent}66`,
                }}
              >
                {SEVERITY_LABEL_ES[detail.severity] ?? detail.severity}
              </span>
            )}
          </div>

          {loading && !detail && (
            <div className="flex items-center gap-2 text-sm text-neutral-400 py-10 justify-center">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Cargando detalle...
            </div>
          )}

          {detail && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white leading-snug">
                  {detail.policyName ?? 'Finding sin política asociada'}
                </h2>
                <p className="text-xs text-neutral-400 mt-1.5 flex flex-wrap gap-x-1.5">
                  {detail.framework && <span>{detail.framework}</span>}
                  {detail.framework && detail.controlId && <span className="text-neutral-600">·</span>}
                  {detail.controlId && <span className="font-mono">{detail.controlId}</span>}
                  {(detail.framework || detail.controlId) && <span className="text-neutral-600">·</span>}
                  <span>{detail.category}</span>
                </p>
              </div>

              {/* How to fix it — the headline section */}
              <div
                className="rounded-xl p-4 bg-white/[0.04] border-l-4"
                style={{ borderColor: accent }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: accent }}>
                  Cómo solucionarlo
                </p>
                <p className="text-sm text-neutral-100 leading-relaxed whitespace-pre-wrap">
                  {detail.suggestedAction ?? 'Esta regla no trae una recomendación específica todavía — revisa la evidencia abajo para entender el hallazgo y aplica la mitigación estándar para este tipo de vulnerabilidad (CWE incluido).'}
                </p>
              </div>

              {/* Metadata grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide mb-0.5">Archivo</p>
                  <p className="font-mono text-xs text-neutral-200 break-all">{detail.filePath}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide mb-0.5">Línea</p>
                  {detail.lineNumber != null ? (
                    <p className="font-mono text-xs text-neutral-200">{detail.lineNumber}</p>
                  ) : (
                    <p className="text-xs text-neutral-500 italic">Archivo completo</p>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide mb-0.5">CWE</p>
                  <p className="font-mono text-xs text-neutral-200">{detail.cweId ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide mb-0.5">Tipo de regla</p>
                  <p className="text-xs text-neutral-200">{detail.ruleType ?? '—'}</p>
                </div>
              </div>

              {/* Evidence */}
              {detail.evidenceSnippet && (
                <div>
                  <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide mb-1.5">Evidencia</p>
                  <pre className="bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-xs font-mono text-neutral-300 whitespace-pre-wrap overflow-x-auto">
                    {detail.evidenceSnippet}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
