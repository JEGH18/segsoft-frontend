import { Link } from 'react-router-dom';
import type { CoverageCounts, SeverityKey, StructuredReport } from '@/types/report';
import { SEVERITY_COLOR_CLASSES } from '@/utils/severityColors';
import type { Severity } from '@/types/enums';
import {
  CATEGORY_LABELS,
  FRAMEWORK_LABELS,
  SEVERITY_LABELS,
  STATUS_CLASSES,
  STATUS_LABELS,
  complianceBarClass,
  formatDateTime,
  formatPercent,
  label,
} from '@/pages/reports/reportFormat';

const SEVERITIES: SeverityKey[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

/**
 * Renders a structured compliance report. The executive view (metrics and
 * recommendations only) is what the API returns for ?view=executive: it has
 * no policyResults and no individual findings, so no evidence snippet can be
 * shown in it. Both views include the five Claude Code Security categories.
 */
export default function ReportPreview({ report }: { report: StructuredReport }) {
  const technical = report.view === 'technical';
  return (
    <div className="space-y-5">
      <ExecutiveSummary report={report} />
      <Recommendations report={report} />
      <SeverityBreakdown report={report} />
      <div className="grid gap-5 lg:grid-cols-2">
        <CategoryCoverage report={report} />
        <FrameworkCoverage report={report} technical={technical} />
      </div>
      {technical && <PolicyResults report={report} />}
      {technical && <FindingsDetail report={report} />}
      {technical && <Traceability report={report} />}
    </div>
  );
}

function Section({ title, children, id }: { title: string; children: React.ReactNode; id: string }) {
  return (
    <section className="card p-5" aria-labelledby={id}>
      <h2 id={id} className="text-sm font-semibold text-neutral-900 mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ExecutiveSummary({ report }: { report: StructuredReport }) {
  const s = report.executiveSummary;
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Resumen ejecutivo">
      <Kpi label="Cumplimiento global" value={formatPercent(s.compliancePercentage)}>
        <Bar value={s.compliancePercentage} />
      </Kpi>
      <Kpi label="Cumplimiento ponderado" value={formatPercent(s.weightedCompliancePercentage)}>
        <Bar value={s.weightedCompliancePercentage} />
      </Kpi>
      <Kpi label="Políticas evaluadas" value={s.totalPolicies}>
        <p className="text-xs text-neutral-500 mt-2">
          {s.compliantPolicies} cumplen · {s.nonCompliantPolicies} no cumplen · {s.requiresReviewPolicies} en revisión
        </p>
      </Kpi>
      <Kpi label="Hallazgos" value={s.totalFindings}>
        <p className="text-xs text-neutral-500 mt-2">
          {s.highestSeverity ? (
            <>
              Severidad máxima:{' '}
              <span className={`badge border ${SEVERITY_COLOR_CLASSES[s.highestSeverity as Severity]}`}>
                {label(SEVERITY_LABELS, s.highestSeverity)}
              </span>
            </>
          ) : (
            'Sin hallazgos'
          )}
        </p>
      </Kpi>
    </section>
  );
}

function Recommendations({ report }: { report: StructuredReport }) {
  const recommendations = report.executiveSummary.recommendations;
  return (
    <Section title="Recomendaciones priorizadas" id="recomendaciones">
      {recommendations.length === 0 ? (
        <p className="text-sm text-neutral-500">Todas las políticas evaluadas se cumplen: no hay acciones pendientes.</p>
      ) : (
        <ol className="space-y-3">
          {recommendations.map((r) => (
            <li key={`${r.priority}-${r.policyId}`} className="flex gap-3">
              <span className="flex-none w-6 h-6 rounded-full bg-neutral-900 text-white text-xs font-semibold flex items-center justify-center">
                {r.priority}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-900">
                  {r.policyName ?? 'Política'}{' '}
                  <span className={`badge ${STATUS_CLASSES[r.status] ?? ''}`}>{label(STATUS_LABELS, r.status)}</span>
                  {r.highestSeverity && (
                    <span className={`badge border ml-1 ${SEVERITY_COLOR_CLASSES[r.highestSeverity as Severity]}`}>
                      {label(SEVERITY_LABELS, r.highestSeverity)}
                    </span>
                  )}
                </p>
                <p className="text-sm text-neutral-600">{r.action}</p>
                <p className="text-xs text-neutral-400">
                  {label(CATEGORY_LABELS, r.category)} · {r.findings} hallazgos ({r.highOrCriticalFindings} altos/críticos)
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}

function SeverityBreakdown({ report }: { report: StructuredReport }) {
  return (
    <Section title="Hallazgos por severidad" id="severidad">
      <div className="flex flex-wrap gap-4">
        {SEVERITIES.map((severity) => (
          <span key={severity} className="flex items-center gap-2 text-sm">
            <span className={`badge border ${SEVERITY_COLOR_CLASSES[severity as Severity]}`}>
              {label(SEVERITY_LABELS, severity)}
            </span>
            <span className="tabular-nums font-semibold">{report.findingsBySeverity[severity]?.count ?? 0}</span>
          </span>
        ))}
      </div>
    </Section>
  );
}

function CoverageRow({ name, coverage, children }: { name: string; coverage: CoverageCounts; children?: React.ReactNode }) {
  const noCoverage = coverage.policiesEvaluated === 0;
  return (
    <li className="py-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-neutral-800">{name}</span>
        <span className="tabular-nums text-neutral-600">
          {noCoverage ? 'Sin cobertura' : formatPercent(coverage.compliancePercentage)}
        </span>
      </div>
      <Bar value={noCoverage ? null : coverage.compliancePercentage} />
      <p className="text-xs text-neutral-400 mt-1">
        {coverage.policiesEvaluated} políticas · {coverage.nonCompliantPolicies} no cumplen · {coverage.findings} hallazgos (
        {coverage.highOrCriticalFindings} altos/críticos)
      </p>
      {children}
    </li>
  );
}

function CategoryCoverage({ report }: { report: StructuredReport }) {
  return (
    <Section title="Cobertura por categoría de Claude Code Security" id="cobertura-categorias">
      <ul className="divide-y divide-neutral-100" aria-label="Categorías del catálogo">
        {report.claudeCodeSecurityCoverage.map((c) => (
          <CoverageRow key={c.category} name={label(CATEGORY_LABELS, c.category)} coverage={c} />
        ))}
      </ul>
    </Section>
  );
}

function FrameworkCoverage({ report, technical }: { report: StructuredReport; technical: boolean }) {
  return (
    <Section title="Cobertura por marco normativo" id="cobertura-marcos">
      {report.frameworkCoverage.length === 0 ? (
        <p className="text-sm text-neutral-500">Las políticas evaluadas no están asociadas a un marco.</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {report.frameworkCoverage.map((f) => (
            <CoverageRow key={f.framework} name={label(FRAMEWORK_LABELS, f.framework)} coverage={f}>
              {technical && f.controls && f.controls.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2" aria-label={`Controles de ${label(FRAMEWORK_LABELS, f.framework)}`}>
                  {f.controls.map((control) => (
                    <span
                      key={control.controlId}
                      className={`badge font-mono ${STATUS_CLASSES[control.status] ?? ''}`}
                      title={`${label(STATUS_LABELS, control.status)} · ${control.policyIds.length} políticas`}
                    >
                      {control.controlId}
                    </span>
                  ))}
                </div>
              )}
            </CoverageRow>
          ))}
        </ul>
      )}
    </Section>
  );
}

function PolicyResults({ report }: { report: StructuredReport }) {
  const policies = report.policyResults ?? [];
  return (
    <section className="card overflow-hidden" aria-labelledby="politicas">
      <h2 id="politicas" className="text-sm font-semibold text-neutral-900 px-5 pt-5 pb-3">
        Resultados por política
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-y border-neutral-200">
            <tr>
              <th className="table-th">Política</th>
              <th className="table-th">Categoría</th>
              <th className="table-th">Marco / control</th>
              <th className="table-th">Estado</th>
              <th className="table-th text-right">Hallazgos</th>
              <th className="table-th text-right">Altos/críticos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {policies.map((p) => (
              <tr key={p.policyId}>
                <td className="table-td">
                  <Link to={`/policies/${p.policyId}`} className="font-medium text-neutral-900 hover:underline">
                    {p.name ?? p.policyId}
                  </Link>
                </td>
                <td className="table-td">{label(CATEGORY_LABELS, p.category)}</td>
                <td className="table-td">
                  {label(FRAMEWORK_LABELS, p.framework)}
                  {p.controlId && <span className="font-mono text-xs text-neutral-500"> · {p.controlId}</span>}
                </td>
                <td className="table-td">
                  <span className={`badge ${STATUS_CLASSES[p.status] ?? ''}`}>{label(STATUS_LABELS, p.status)}</span>
                </td>
                <td className="table-td text-right tabular-nums">{p.findingsCount}</td>
                <td className="table-td text-right tabular-nums">{p.highOrCriticalCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FindingsDetail({ report }: { report: StructuredReport }) {
  const total = SEVERITIES.reduce((sum, s) => sum + (report.findingsBySeverity[s]?.findings?.length ?? 0), 0);
  return (
    <Section title={`Hallazgos detallados (${total})`} id="hallazgos">
      {total === 0 ? (
        <p className="text-sm text-neutral-500">No se identificaron hallazgos.</p>
      ) : (
        <div className="space-y-5">
          {SEVERITIES.filter((s) => (report.findingsBySeverity[s]?.findings?.length ?? 0) > 0).map((severity) => (
            <div key={severity}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                Severidad {label(SEVERITY_LABELS, severity).toLowerCase()} ({report.findingsBySeverity[severity].count})
              </h3>
              <ul className="space-y-2">
                {report.findingsBySeverity[severity].findings?.map((f, index) => (
                  <li key={f.findingId ?? `${severity}-${index}`} className="border border-neutral-200 rounded-lg p-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className={`badge border ${SEVERITY_COLOR_CLASSES[severity as Severity]}`}>
                        {label(SEVERITY_LABELS, severity)}
                      </span>
                      <span className="font-medium text-neutral-900">{f.policyName ?? 'Política'}</span>
                      <span className="text-xs text-neutral-400">
                        {label(CATEGORY_LABELS, f.category)}
                        {f.cweId && ` · ${f.cweId}`}
                      </span>
                    </div>
                    <p className="font-mono text-xs text-neutral-600 mt-1 break-all">
                      {f.filePath}
                      {f.lineNumber !== null && `:${f.lineNumber}`}
                    </p>
                    {f.evidenceSnippet && (
                      <pre className="mt-2 text-xs bg-neutral-50 border border-neutral-200 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                        {f.evidenceSnippet}
                      </pre>
                    )}
                    {f.suggestedAction && (
                      <p className="text-xs text-neutral-600 mt-2">
                        <span className="font-semibold">Acción sugerida:</span> {f.suggestedAction}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function Traceability({ report }: { report: StructuredReport }) {
  const m = report.metadata;
  return (
    <Section title="Metadatos y trazabilidad" id="trazabilidad">
      <dl className="grid grid-cols-1 sm:grid-cols-[12rem_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-neutral-500">Reporte</dt>
        <dd className="font-mono text-xs break-all">{m.reportId}</dd>
        <dt className="text-neutral-500">Análisis</dt>
        <dd>
          {m.analysisId ? (
            <Link to={`/analyses/${m.analysisId}/results`} className="font-mono text-xs hover:underline">
              {m.analysisId}
            </Link>
          ) : (
            '—'
          )}
          <span className="text-neutral-500">
            {' '}
            · {m.rulesExecuted} de {m.rulesTotal} reglas · {formatDateTime(m.analysisCompletedAt)}
          </span>
        </dd>
        <dt className="text-neutral-500">Repositorio</dt>
        <dd>
          {m.repoName ?? '—'}
          {m.branch && <span className="text-neutral-500"> (rama {m.branch})</span>}
          {m.repositoryId && (
            <Link to={`/reports?repositoryId=${m.repositoryId}`} className="ml-2 text-xs hover:underline">
              Ver histórico de reportes
            </Link>
          )}
        </dd>
        <dt className="text-neutral-500">Checksum SHA-256</dt>
        <dd className="font-mono text-xs break-all">{report.checksum}</dd>
        <dt className="text-neutral-500">Versión del contenido</dt>
        <dd>v{report.schemaVersion}</dd>
      </dl>
    </Section>
  );
}

function Kpi({ label: title, value, children }: { label: string; value: string | number; children?: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="text-2xl font-bold tabular-nums text-neutral-900">{value}</div>
      <div className="text-xs text-neutral-500 mt-1">{title}</div>
      {children}
    </div>
  );
}

function Bar({ value }: { value: number | null | undefined }) {
  const width = value === null || value === undefined ? 0 : Math.max(0, Math.min(100, Number(value)));
  return (
    <div className="h-1.5 bg-neutral-100 rounded-full mt-2 overflow-hidden" aria-hidden="true">
      <div className={`h-full rounded-full ${complianceBarClass(value)}`} style={{ width: `${width}%` }} />
    </div>
  );
}
