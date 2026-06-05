import { useMemo, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { startAnalysis, getAnalysis } from '@/api/analyses';
import { usePolicies, usePolicySelection, useSavePolicySelection } from '@/hooks/usePolicySelection';
import { Category, Framework } from '@/types/enums';
import type { Policy } from '@/types/policy';

interface PolicySelectionViewProps {
  repositoryId?: string;
}

const ALL_CATEGORIES: Category[] = [
  Category.SQL_INJECTION,
  Category.XSS,
  Category.AUTHENTICATION_FAILURE,
  Category.INSECURE_DATA_HANDLING,
  Category.DEPENDENCY_VULNERABILITY,
];

const CATEGORY_LABELS: Record<Category, string> = {
  [Category.SQL_INJECTION]: 'SQL Injection',
  [Category.XSS]: 'XSS',
  [Category.AUTHENTICATION_FAILURE]: 'Fallo de Autenticación',
  [Category.INSECURE_DATA_HANDLING]: 'Manejo Inseguro de Datos',
  [Category.DEPENDENCY_VULNERABILITY]: 'Vulnerabilidades en Dependencias',
};

export default function PolicySelectionView({ repositoryId }: PolicySelectionViewProps) {
  const params = useParams<{ repoId: string }>();
  const navigate = useNavigate();
  const resolvedRepositoryId = repositoryId ?? params.repoId;

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | Category>('ALL');
  const [frameworkFilter, setFrameworkFilter] = useState<'ALL' | Framework>('ALL');
  const [selectedPolicyIds, setSelectedPolicyIds] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [launchingAnalysis, setLaunchingAnalysis] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const policiesQuery = usePolicies();
  const selectionQuery = usePolicySelection(resolvedRepositoryId);
  const saveSelectionMutation = useSavePolicySelection();

  const initialSelectedIds = selectionQuery.data?.selectedPolicies?.map((policy) => policy.id) ?? [];
  const effectiveSelectedIds = isDirty ? selectedPolicyIds : initialSelectedIds;
  const hasExistingSelection = Boolean(selectionQuery.data);

  const filteredPolicies = useMemo(() => {
    const policies = policiesQuery.data?.content ?? [];
    return policies.filter((policy) => {
      const byName = policy.name.toLowerCase().includes(search.trim().toLowerCase());
      const byCategory = categoryFilter === 'ALL' || policy.category === categoryFilter;
      const byFramework = frameworkFilter === 'ALL' || policy.framework === frameworkFilter;
      return byName && byCategory && byFramework;
    });
  }, [policiesQuery.data, search, categoryFilter, frameworkFilter]);

  const selectedPolicies = useMemo(() => {
    const policiesById = new Map((policiesQuery.data?.content ?? []).map((policy) => [policy.id, policy]));
    return effectiveSelectedIds
      .map((id) => policiesById.get(id))
      .filter((policy): policy is Policy => Boolean(policy));
  }, [policiesQuery.data, effectiveSelectedIds]);

  const categoryCoverage = useMemo(() => {
    return ALL_CATEGORIES.reduce<Record<Category, number>>((acc, category) => {
      acc[category] = selectedPolicies.filter((policy) => policy.category === category).length;
      return acc;
    }, {} as Record<Category, number>);
  }, [selectedPolicies]);

  const uncoveredCategories = useMemo(() => {
    return ALL_CATEGORIES.filter((category) => categoryCoverage[category] === 0);
  }, [categoryCoverage]);

  const onTogglePolicy = (policyId: string) => {
    setSuccessMessage(null);
    setIsDirty(true);
    setSelectedPolicyIds(() => {
      if (!effectiveSelectedIds.includes(policyId)) {
        return [...effectiveSelectedIds, policyId];
      }
      return effectiveSelectedIds.filter((id) => id !== policyId);
    });
  };

  const onSave = async () => {
    if (!resolvedRepositoryId) return;
    setSuccessMessage(null);
    await saveSelectionMutation.mutateAsync({
      repositoryId: resolvedRepositoryId,
      data: { policyIds: effectiveSelectedIds },
      hasExistingSelection,
    });
    setIsDirty(false);
    setSelectedPolicyIds(effectiveSelectedIds);
    setSuccessMessage('Selección guardada correctamente.');
  };

  async function onLaunchAnalysis() {
    if (!resolvedRepositoryId) return;
    setAnalysisError(null);
    setAnalysisStatus(null);
    setLaunchingAnalysis(true);
    try {
      const analysis = await startAnalysis(resolvedRepositoryId);
      setAnalysisStatus(analysis.status);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const updated = await getAnalysis(analysis.id);
          setAnalysisStatus(updated.status);
          if (updated.status === 'COMPLETED' || updated.status === 'FAILED') {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            if (updated.status === 'COMPLETED') {
              navigate(`/analyses/${analysis.id}/results`);
            }
          }
        } catch {
          clearInterval(pollRef.current!);
          pollRef.current = null;
        }
      }, 2000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'No se pudo iniciar el análisis.';
      setAnalysisError(msg);
    } finally {
      setLaunchingAnalysis(false);
    }
  }

  if (!resolvedRepositoryId) {
    return <div role="alert" className="text-sm text-red-600">No se encontró repositoryId en la ruta.</div>;
  }

  if (policiesQuery.isLoading || selectionQuery.isLoading) {
    return <div className="text-sm text-neutral-500">Cargando selección de políticas...</div>;
  }

  if (policiesQuery.isError) {
    return <div role="alert" className="text-sm text-red-600">Error cargando políticas disponibles.</div>;
  }

  if (selectionQuery.isError) {
    return <div role="alert" className="text-sm text-red-600">Error cargando selección actual.</div>;
  }

  const saveErrorMessage =
    (saveSelectionMutation.error as AxiosError<{ message?: string }> | null)?.response?.data?.message ??
    (saveSelectionMutation.isError ? 'No se pudo guardar la selección.' : null);

  return (
    <section aria-label="Selección de políticas por repositorio" className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Selección de políticas</h1>
        <p className="page-subtitle">
          Repositorio: <code className="font-mono text-neutral-700">{resolvedRepositoryId}</code>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: filters + table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-4">
            <div className="flex flex-wrap gap-3">
              <input
                id="policy-name-filter"
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar política..."
                aria-label="Filtrar por nombre"
                className="form-input max-w-xs"
              />
              <select
                id="policy-category-filter"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value as 'ALL' | Category)}
                aria-label="Filtrar por categoría"
                className="form-select w-auto"
              >
                <option value="ALL">Todas las categorías</option>
                {ALL_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>
                ))}
              </select>
              <select
                id="policy-framework-filter"
                value={frameworkFilter}
                onChange={(event) => setFrameworkFilter(event.target.value as 'ALL' | Framework)}
                aria-label="Filtrar por framework"
                className="form-select w-auto"
              >
                <option value="ALL">Todos los frameworks</option>
                {Object.values(Framework).map((framework) => (
                  <option key={framework} value={framework}>{framework}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Políticas disponibles</caption>
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="table-th w-12">Sel.</th>
                    <th className="table-th">Nombre</th>
                    <th className="table-th">Categoría</th>
                    <th className="table-th">Framework</th>
                    <th className="table-th">Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredPolicies.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-neutral-500">
                        No hay políticas para los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredPolicies.map((policy) => {
                      const isSelected = effectiveSelectedIds.includes(policy.id);
                      return (
                        <tr
                          key={policy.id}
                          className={`cursor-pointer transition-colors ${isSelected ? 'bg-neutral-50' : 'hover:bg-neutral-50'}`}
                          onClick={() => onTogglePolicy(policy.id)}
                        >
                          <td className="table-td">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => onTogglePolicy(policy.id)}
                              aria-label={`Seleccionar ${policy.name}`}
                              className="w-4 h-4 rounded border-neutral-300 accent-neutral-900"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="table-td font-medium text-neutral-900">{policy.name}</td>
                          <td className="table-td text-xs">{CATEGORY_LABELS[policy.category as Category] ?? policy.category}</td>
                          <td className="table-td text-xs font-mono">{policy.framework}</td>
                          <td className="table-td text-xs font-mono">{policy.controlId ?? '-'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: summary sidebar */}
        <aside aria-label="Resumen de cobertura" className="space-y-4">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-neutral-900 mb-4">Resumen de selección</h2>
            <div className="text-3xl font-bold text-neutral-900 mb-1">{selectedPolicies.length}</div>
            <p className="text-xs text-neutral-500 mb-5">políticas seleccionadas</p>

            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Cobertura por categoría</h3>
            <ul className="space-y-2">
              {ALL_CATEGORIES.map((category) => {
                const count = categoryCoverage[category];
                return (
                  <li key={category} className="flex items-center justify-between">
                    <span className="text-xs text-neutral-600">{CATEGORY_LABELS[category]}</span>
                    <span className={`badge text-xs ${count > 0 ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                      {count}
                    </span>
                  </li>
                );
              })}
            </ul>

            {uncoveredCategories.length > 0 && (
              <div role="alert" className="mt-4 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-600">
                Faltan {uncoveredCategories.length} categor{uncoveredCategories.length === 1 ? 'ía' : 'ías'} por cubrir.
              </div>
            )}
          </div>

          {saveErrorMessage && (
            <div role="alert" className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
              {saveErrorMessage}
            </div>
          )}
          {successMessage && (
            <div role="status" className="px-4 py-3 bg-neutral-50 border border-neutral-200 text-neutral-700 text-sm rounded-lg">
              {successMessage}
            </div>
          )}

          <button
            type="button"
            onClick={onSave}
            disabled={saveSelectionMutation.isPending || isDirty === false && hasExistingSelection}
            className="btn-outline w-full justify-center"
          >
            {saveSelectionMutation.isPending ? 'Guardando...' : 'Guardar selección'}
          </button>

          <div className="border-t border-neutral-100 pt-4 space-y-3">
            {analysisError && (
              <div role="alert" className="px-3 py-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg">
                {analysisError}
              </div>
            )}
            {analysisStatus && analysisStatus !== 'COMPLETED' && (
              <div role="status" className="flex items-center gap-2 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-600">
                <svg className="animate-spin h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                {analysisStatus === 'QUEUED' ? 'En cola...' : 'Analizando código...'}
              </div>
            )}
            <button
              type="button"
              onClick={onLaunchAnalysis}
              disabled={launchingAnalysis || !hasExistingSelection || effectiveSelectedIds.length === 0 || analysisStatus === 'RUNNING' || analysisStatus === 'QUEUED'}
              className="btn-primary w-full justify-center"
            >
              {launchingAnalysis ? 'Iniciando...' : 'Iniciar análisis →'}
            </button>
            {!hasExistingSelection && (
              <p className="text-xs text-neutral-400 text-center">Guarda la selección primero</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
