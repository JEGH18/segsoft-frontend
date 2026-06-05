import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getAnalysisFindings, getAnalysisResults } from '@/api/analyses';
import { getFindingDetail } from '@/api/findings';
import { useAuth } from '@/store/authStore';
import type {
  AnalysisResultsResponse,
  FindingDetailResponse,
  FindingListItem,
  FindingsFilters,
} from '@/types/analysis';
import FindingsFiltersComponent from '@/components/results/FindingsFilters';
import FindingsTable from '@/components/results/FindingsTable';
import FindingDetailPanel from '@/components/results/FindingDetailPanel';
import ResultsDashboard from '@/components/results/ResultsDashboard';

const DEFAULT_FILTERS: FindingsFilters = {
  severities: [],
  categories: [],
  policyId: '',
};

export default function AnalysisResultsPage() {
  const { id } = useParams<{ id: string }>();
  const { setLastAnalysisId } = useAuth();
  const [results, setResults] = useState<AnalysisResultsResponse | null>(null);
  const [findings, setFindings] = useState<FindingListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFilters] = useState<FindingsFilters>(DEFAULT_FILTERS);
  const [filePath, setFilePath] = useState('');
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<FindingDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (id) setLastAnalysisId(id);
  }, [id, setLastAnalysisId]);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        setLoading(true);
        const response = await getAnalysisResults(id);
        setResults(response);
      } catch {
        setError('No se pudieron cargar los resultados del análisis.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        setLoading(true);
        const response = await getAnalysisFindings({
          analysisId: id,
          page,
          size,
          filePath,
          filters,
        });
        setFindings(response.content);
        setTotalPages(response.totalPages);
      } catch {
        setError('No se pudieron cargar los findings.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, page, size, filePath, filters]);

  useEffect(() => {
    if (!selectedFindingId) return;
    void (async () => {
      try {
        setLoadingDetail(true);
        const response = await getFindingDetail(selectedFindingId);
        setDetail(response);
      } catch {
        setError('No se pudo cargar el detalle del finding.');
      } finally {
        setLoadingDetail(false);
      }
    })();
  }, [selectedFindingId]);

  const policies = useMemo(() => {
    if (!results) return [];
    const map = new Map<string, string>();
    for (const finding of results.findings) {
      if (finding.policyId && finding.policyName) {
        map.set(finding.policyId, finding.policyName);
      }
    }
    return Array.from(map.entries()).map(([policyId, name]) => ({ id: policyId, name }));
  }, [results]);

  if (!id) {
    return <div role="alert" className="text-sm text-red-600">No se recibió analysisId en la ruta.</div>;
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Resultados del análisis</h1>
        <p className="page-subtitle font-mono text-xs">{id}</p>
      </div>

      {error && (
        <div role="alert" className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
          {error}
        </div>
      )}

      {loading && !results && (
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          Cargando resultados...
        </div>
      )}

      {results && <ResultsDashboard results={results} />}

      <FindingsFiltersComponent
        filters={filters}
        filePath={filePath}
        onFiltersChange={(next) => {
          setPage(0);
          setFilters(next);
        }}
        onFilePathChange={(value) => {
          setPage(0);
          setFilePath(value);
        }}
        policies={policies}
      />

      <FindingsTable
        findings={findings}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onSelectFinding={setSelectedFindingId}
      />

      <FindingDetailPanel
        detail={detail}
        loading={loadingDetail}
        onClose={() => {
          setSelectedFindingId(null);
          setDetail(null);
        }}
      />
    </div>
  );
}
