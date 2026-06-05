import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { AnalysisResultsResponse } from '@/types/analysis';
import { Category } from '@/types/enums';

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

const CHART_COLORS = ['#0f0f0f', '#404040', '#737373', '#a3a3a3', '#d4d4d4'];

const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
const SEVERITY_CLASSES = {
  CRITICAL: 'bg-neutral-900 text-white',
  HIGH: 'bg-neutral-700 text-white',
  MEDIUM: 'bg-neutral-400 text-white',
  LOW: 'bg-neutral-200 text-neutral-700',
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
          <div className="text-3xl font-bold text-neutral-900">{results.compliancePercentage}%</div>
          <div className="text-xs text-neutral-500 mt-1">Cumplimiento global</div>
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
                <span className={`badge ${SEVERITY_CLASSES[sev]}`}>{sev}</span>
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
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={75} label>
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
                    <td className="table-td font-mono text-xs text-neutral-600">{pr.policyId}</td>
                    <td className="table-td">
                      <span className={`badge ${
                        pr.status === 'COMPLIANT'
                          ? 'bg-neutral-900 text-white'
                          : pr.status === 'REQUIRES_REVIEW'
                          ? 'bg-neutral-300 text-neutral-700'
                          : 'bg-neutral-100 text-neutral-500'
                      }`}>
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
