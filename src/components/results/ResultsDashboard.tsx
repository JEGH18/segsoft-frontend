import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { AnalysisResultsResponse } from '@/types/analysis';
import { Category } from '@/types/enums';
import { SEVERITY_COLOR_CLASSES } from '@/utils/severityColors';

interface Props {
  results: AnalysisResultsResponse;
}

const CATEGORY_ORDER = [
  Category.SQL_INJECTION,
  Category.XSS,
  Category.AUTHENTICATION_FAILURE,
  Category.INSECURE_DATA_HANDLING,
  Category.DEPENDENCY_VULNERABILITY,
];

// Validated categorical palette (fixed order — see the dataviz skill's palette
// reference), using the richer/deeper step of each hue so every slice clears
// full contrast against the white card instead of reading as pale. Never
// reorder or cycle: the order is what keeps adjacent slices distinguishable
// under color-vision deficiency.
const CHART_COLORS = ['#2a78d6', '#eb6834', '#199e70', '#c98500', '#d55181'];

const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;

// Fixed status scale (good/warning/critical) — reserved meaning, same tokens
// used for the policy "Activa" badge. NON_COMPLIANT is the only true failure,
// so it alone gets red; REQUIRES_REVIEW is a warning, not a failure.
const POLICY_STATUS_CLASSES: Record<string, string> = {
  COMPLIANT: 'bg-[#0ca30c] text-neutral-900',
  REQUIRES_REVIEW: 'bg-[#fab219] text-neutral-900',
  NON_COMPLIANT: 'bg-[#d03b3b] text-white',
};

export default function ResultsDashboard({ results }: Props) {
  const compliant = results.policyResults.filter((item) => item.status === 'COMPLIANT').length;
  const nonCompliant = results.policyResults.filter((item) => item.status === 'NON_COMPLIANT').length;
  const requiresReview = results.policyResults.filter((item) => item.status === 'REQUIRES_REVIEW').length;

  const categoryData = CATEGORY_ORDER.map((category) => ({
    name: category,
    value: Number(results.categoryBreakdown[category] ?? 0),
  }));

  const severitySummary = results.findings.reduce<Record<string, number>>((acc, finding) => {
    acc[finding.severity] = (acc[finding.severity] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section aria-label="Dashboard de resultados" className="space-y-5 mb-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="text-3xl font-bold text-neutral-900">{results.weightedCompliancePercentage}%</div>
          <div className="text-xs text-neutral-500 mt-1">Cumplimiento ponderado</div>
          <div className="text-xs text-neutral-400 mt-1.5 pt-1.5 border-t border-neutral-100">
            {results.compliancePercentage}% sin ponderar
          </div>
        </div>
        <div className="card p-5">
          <div className="text-3xl font-bold text-neutral-900">{results.policyResults.length}</div>
          <div className="text-xs text-neutral-500 mt-1">Políticas evaluadas</div>
        </div>
        <div className="card p-5">
          <div className="text-3xl font-bold text-neutral-900">{compliant}</div>
          <div className="text-xs text-neutral-500 mt-1">Conformes</div>
        </div>
        <div className="card p-5">
          <div className="text-3xl font-bold text-neutral-900">{nonCompliant + requiresReview}</div>
          <div className="text-xs text-neutral-500 mt-1">No conformes / revisión</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Severity summary */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-neutral-700 mb-4">Findings por severidad</h3>
          <div className="flex flex-wrap gap-3">
            {SEVERITY_ORDER.map((sev) => (
              <div key={sev} className="flex items-center gap-2">
                <span className={`badge border ${SEVERITY_COLOR_CLASSES[sev]}`}>{sev}</span>
                <span className="text-sm font-semibold text-neutral-900">{severitySummary[sev] ?? 0}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-2xl font-bold text-neutral-900">
            {results.findings.length}
            <span className="text-sm font-normal text-neutral-500 ml-1">findings totales</span>
          </div>
        </div>

        {/* Category pie chart */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-neutral-700 mb-2">Distribución por categoría</h3>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div style={{ width: 160, height: 160, flexShrink: 0 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={75}>
                    {categoryData.map((entry, index) => (
                      <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e5e5e5',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend: the reliable identity channel — color is never the only cue */}
            <ul className="flex-1 w-full space-y-1.5">
              {categoryData.map((entry, index) => (
                <li key={entry.name} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    aria-hidden="true"
                  />
                  <span className="text-neutral-600 flex-1 truncate">{entry.name}</span>
                  <span className="text-neutral-900 font-semibold tabular-nums">{entry.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Policy compliance table */}
      {results.policyResults.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-100">
            <h3 className="text-sm font-semibold text-neutral-700">Resultados por política</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="table-th">Política</th>
                  <th className="table-th">Estado</th>
                  <th className="table-th text-right">Findings</th>
                  <th className="table-th text-right">Críticos/Altos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {results.policyResults.map((pr) => (
                  <tr key={pr.policyId} className="hover:bg-neutral-50 transition-colors">
                    <td className="table-td text-neutral-700">{pr.policyName}</td>
                    <td className="table-td">
                      <span className={`badge ${POLICY_STATUS_CLASSES[pr.status] ?? 'bg-neutral-100 text-neutral-500'}`}>
                        {pr.status}
                      </span>
                    </td>
                    <td className="table-td text-right tabular-nums">{pr.findingsCount}</td>
                    <td className="table-td text-right tabular-nums">{pr.highOrCriticalCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
