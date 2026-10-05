import { useEffect, useMemo, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { startAnalysis, getAnalysis } from '@/api/analyses';
import { useApplyPolicySet, usePolicies, usePolicySelection, useSavePolicySelection } from '@/hooks/usePolicySelection';
import { useCreatePolicySet, usePolicySets } from '@/hooks/usePolicySets';
import { Category, Framework } from '@/types/enums';
import type { Policy } from '@/types/policy';
import SelectAllCheckbox from '@/components/common/SelectAllCheckbox';

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

const FRAMEWORK_LABELS: Record<Framework, string> = {
  [Framework.OWASP_TOP_10_2021]: 'OWASP Top 10',
  [Framework.ISO_27001]: 'ISO 27001',
  [Framework.OWASP_ASVS]: 'OWASP ASVS',
  [Framework.NIST_SP_800_53]: 'NIST SP 800-53',
  [Framework.DEVSECOPS]: 'DevSecOps',
  [Framework.CUSTOM]: 'Personalizado',
};

function describeSource(source: string | undefined | null): string {
  if (!source || source === 'MANUAL') return 'Selección manual';
  if (source.startsWith('MANUAL_ADJUSTMENT')) return 'Ajuste manual (a partir de un Policy Set)';
  if (source.startsWith('POLICY_SET:')) {
    const version = source.split(':')[2];
    return version ? `Aplicado desde un Policy Set (v${version})` : 'Aplicado desde un Policy Set';
  }
  return source;
}

// Both "POLICY_SET:{id}:{version}" and "MANUAL_ADJUSTMENT (from POLICY_SET:{id}:{version})"
// carry the origin set's id in the same place -- pull it out so a selection
// that has already drifted from that set can still be compared against it.
function parseOriginPolicySetId(source: string | undefined | null): string | null {
  if (!source) return null;
  const match = source.match(/POLICY_SET:([^:]+):/);
  return match ? match[1] : null;
}

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
}

export default function PolicySelectionView({ repositoryId }: PolicySelectionViewProps) {
  const params = useParams<{ repoId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resolvedRepositoryId = repositoryId ?? params.repoId;
  const preselectFramework = searchParams.get('framework') as Framework | null;
  const preselectPolicySetId = searchParams.get('policySet');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | Category>('ALL');
  const [frameworkFilter, setFrameworkFilter] = useState<'ALL' | Framework>(preselectFramework ?? 'ALL');
  const [selectedPolicyIds, setSelectedPolicyIds] = useState<string[]>([]);
  const [previewPolicySetId, setPreviewPolicySetId] = useState<string | null>(null);
  // Unlike previewPolicySetId (cleared the instant a checkbox is touched, so
  // the "Aplicar / Cancelar" pair stops applying), this is the reference set
  // divergence gets measured against -- it must survive that same toggle,
  // otherwise unchecking a box the moment you preview a set (before ever
  // clicking "Aplicar") has nothing to compare against and the warning never
  // fires at all.
  const [lastPolicySetId, setLastPolicySetId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [appliedFrameworkPreselect, setAppliedFrameworkPreselect] = useState(false);
  const [appliedPolicySetPreselect, setAppliedPolicySetPreselect] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSaveAsNewSetForm, setShowSaveAsNewSetForm] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [launchingAnalysis, setLaunchingAnalysis] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const policiesQuery = usePolicies();
  const policySetsQuery = usePolicySets('ACTIVE');
  const selectionQuery = usePolicySelection(resolvedRepositoryId);
  const saveSelectionMutation = useSavePolicySelection();
  const applyPolicySetMutation = useApplyPolicySet();
  const createPolicySetMutation = useCreatePolicySet();

  const initialSelectedIds = selectionQuery.data?.selectedPolicies?.map((policy) => policy.id) ?? [];
  const appliedPolicySetName = selectionQuery.data?.policySetName ?? null;
  const previewPolicySet = policySetsQuery.data?.find((ps) => ps.id === previewPolicySetId) ?? null;
  // While previewing a Policy Set (not yet applied), the table below and the
  // coverage summary must reflect exactly what that set would check --
  // otherwise the preview card says "2 policies" while the list below shows
  // nothing selected, which is confusing and was reported as such.
  const effectiveSelectedIds = isDirty ? selectedPolicyIds : (previewPolicySet?.policyIds ?? initialSelectedIds);
  const hasExistingSelection = Boolean(selectionQuery.data);

  // A manual edit made on top of a selection that traces back to a Policy
  // Set (even if that link was already dropped by an earlier adjustment)
  // may no longer match that set's exact composition -- that's the moment
  // worth surfacing "you've drifted, want to keep this as a reusable set?".
  const originPolicySetId = lastPolicySetId ?? parseOriginPolicySetId(selectionQuery.data?.source);
  const originPolicySet = policySetsQuery.data?.find((ps) => ps.id === originPolicySetId) ?? null;
  const isDivergedFromOrigin = Boolean(
    isDirty && originPolicySetId && (!originPolicySet || !sameIds(effectiveSelectedIds, originPolicySet.policyIds)),
  );

  // Coming from the dashboard with a framework already picked: preselect every
  // policy of that framework so the user only has to save + launch. Only
  // kicks in once (and never overrides a selection the repo already had).
  useEffect(() => {
    if (appliedFrameworkPreselect || !preselectFramework) return;
    if (policiesQuery.isLoading || selectionQuery.isLoading) return;
    if (hasExistingSelection) {
      setAppliedFrameworkPreselect(true);
      return;
    }
    const matchingIds = (policiesQuery.data?.content ?? [])
      .filter((policy) => policy.framework === preselectFramework)
      .map((policy) => policy.id);
    if (matchingIds.length > 0) {
      setSelectedPolicyIds(matchingIds);
      setIsDirty(true);
    }
    setAppliedFrameworkPreselect(true);
  }, [appliedFrameworkPreselect, preselectFramework, policiesQuery.isLoading, policiesQuery.data, selectionQuery.isLoading, hasExistingSelection]);

  // Coming from the dashboard with a Policy Set already picked: open the
  // preview for it (name + policies it includes) instead of silently
  // checking boxes, so the user still confirms the actual "apply" action.
  // Same guard as the framework preselect -- only once, and never overrides
  // a selection the repo already had.
  useEffect(() => {
    if (appliedPolicySetPreselect || !preselectPolicySetId) return;
    if (policySetsQuery.isLoading || selectionQuery.isLoading) return;
    if (hasExistingSelection) {
      setAppliedPolicySetPreselect(true);
      return;
    }
    const policySet = (policySetsQuery.data ?? []).find((ps) => ps.id === preselectPolicySetId);
    if (policySet) {
      setPreviewPolicySetId(policySet.id);
      setLastPolicySetId(policySet.id);
    }
    setAppliedPolicySetPreselect(true);
  }, [appliedPolicySetPreselect, preselectPolicySetId, policySetsQuery.isLoading, policySetsQuery.data, selectionQuery.isLoading, hasExistingSelection]);

  async function onConfirmApplyPolicySet() {
    if (!resolvedRepositoryId || !previewPolicySetId) return;
    setSuccessMessage(null);
    await applyPolicySetMutation.mutateAsync({
      repositoryId: resolvedRepositoryId,
      policySetId: previewPolicySetId,
    });
    setPreviewPolicySetId(null);
    setIsDirty(false);
    setSelectedPolicyIds([]);
    setSuccessMessage('Policy Set aplicado correctamente.');
  }

  function onOpenSaveAsNewSetForm() {
    setNewSetName(originPolicySet ? `${originPolicySet.name} (variante)` : 'Nuevo Policy Set');
    setShowSaveAsNewSetForm(true);
  }

  useEffect(() => {
    if (!isDivergedFromOrigin) setShowSaveAsNewSetForm(false);
  }, [isDivergedFromOrigin]);

  async function onSaveAsNewPolicySet() {
    if (!resolvedRepositoryId || !newSetName.trim()) return;
    setSuccessMessage(null);
    const created = await createPolicySetMutation.mutateAsync({
      name: newSetName.trim(),
      policyIds: effectiveSelectedIds,
    });
    // The point of naming the variant is to keep using it here too -- reuse
    // the same apply-set action so this selection's source correctly becomes
    // POLICY_SET:{created.id}:1 instead of staying a plain manual adjustment.
    await applyPolicySetMutation.mutateAsync({
      repositoryId: resolvedRepositoryId,
      policySetId: created.id,
    });
    setLastPolicySetId(created.id);
    setShowSaveAsNewSetForm(false);
    setIsDirty(false);
    setSelectedPolicyIds([]);
    setSuccessMessage(`Policy Set "${created.name}" creado y aplicado.`);
  }

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
    // Ticking a box while a Policy Set preview is showing turns this into a
    // manual customization starting from that preview's composition, so the
    // "Aplicar este Policy Set" / "Cancelar" pair no longer applies.
    setPreviewPolicySetId(null);
    setSelectedPolicyIds(() => {
      if (!effectiveSelectedIds.includes(policyId)) {
        return [...effectiveSelectedIds, policyId];
      }
      return effectiveSelectedIds.filter((id) => id !== policyId);
    });
  };

  // Same effects as ticking boxes one by one (see onTogglePolicy), applied
  // to the whole visible list at once by "Seleccionar todas".
  const onReplaceSelection = (policyIds: string[]) => {
    setSuccessMessage(null);
    setIsDirty(true);
    setPreviewPolicySetId(null);
    setSelectedPolicyIds(policyIds);
  };

  const isFiltered = search.trim() !== '' || categoryFilter !== 'ALL' || frameworkFilter !== 'ALL';

  const onSave = async () => {
    if (!resolvedRepositoryId) return;
    setSuccessMessage(null);
    // Manual save: never carries policySetId. If this selection was applied
    // from a set, the backend derives "MANUAL_ADJUSTMENT (from ...)" on its
    // own from the previously stored source -- applying is only ever done
    // through the dedicated apply-set action above.
    await saveSelectionMutation.mutateAsync({
      repositoryId: resolvedRepositoryId,
      data: { policyIds: effectiveSelectedIds, policySetId: null },
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

      {preselectFramework && appliedFrameworkPreselect && isDirty && (
        <div role="status" className="px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-700">
          Se preseleccionaron {effectiveSelectedIds.length} política{effectiveSelectedIds.length === 1 ? '' : 's'} de{' '}
          <span className="font-semibold">{FRAMEWORK_LABELS[preselectFramework] ?? preselectFramework}</span>.
          Revisa la lista y dale a <span className="font-semibold">Guardar selección</span> cuando estés listo.
        </div>
      )}

      {isDivergedFromOrigin && (
        <div role="status" className="px-4 py-3 bg-white border-2 border-neutral-900 rounded-lg text-sm text-neutral-700 space-y-2">
          <p className="font-semibold text-neutral-900 uppercase text-xs tracking-wider">Selección modificada</p>
          <p>
            Ya no coincide exactamente con{' '}
            <span className="font-semibold">{originPolicySet?.name ?? 'el Policy Set aplicado'}</span>.
            Puedes guardarla como un nuevo Policy Set para reutilizarla, o seguir así (quedará como ajuste manual).
          </p>

          {!showSaveAsNewSetForm ? (
            <button
              type="button"
              onClick={onOpenSaveAsNewSetForm}
              className="btn-outline text-xs px-3 py-1.5 bg-white"
            >
              Guardar como nuevo Policy Set
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={newSetName}
                onChange={(event) => setNewSetName(event.target.value)}
                aria-label="Nombre del nuevo Policy Set"
                placeholder="Nombre del nuevo Policy Set"
                className="form-input w-auto flex-1 min-w-[220px]"
              />
              <button
                type="button"
                onClick={onSaveAsNewPolicySet}
                disabled={!newSetName.trim() || createPolicySetMutation.isPending || applyPolicySetMutation.isPending}
                className="btn-primary text-xs px-3 py-1.5"
              >
                {createPolicySetMutation.isPending || applyPolicySetMutation.isPending ? 'Creando...' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={() => setShowSaveAsNewSetForm(false)}
                disabled={createPolicySetMutation.isPending || applyPolicySetMutation.isPending}
                className="btn-outline text-xs px-3 py-1.5 bg-white"
              >
                Cancelar
              </button>
            </div>
          )}

          {createPolicySetMutation.isError && (
            <p role="alert" className="text-xs text-red-600">
              {(createPolicySetMutation.error as AxiosError<{ message?: string }>)?.response?.data?.message
                ?? 'No se pudo crear el Policy Set.'}
            </p>
          )}
        </div>
      )}

      {(policySetsQuery.data?.length ?? 0) > 0 && (
        <div className="card p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="policy-set-apply" className="form-label shrink-0">Aplicar un Policy Set</label>
            <select
              id="policy-set-apply"
              value={previewPolicySetId ?? ''}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) {
                  // "Vacío" is a real choice, not just a cleared placeholder:
                  // it dynamically empties the checkboxes below right away,
                  // the same way picking a real Policy Set dynamically checks
                  // them -- it doesn't just cancel back to whatever was there.
                  setSuccessMessage(null);
                  setPreviewPolicySetId(null);
                  setLastPolicySetId(null);
                  setIsDirty(true);
                  setSelectedPolicyIds([]);
                  return;
                }
                setPreviewPolicySetId(value);
                setLastPolicySetId(value);
              }}
              aria-label="Elegir un Policy Set para aplicar"
              className="form-select w-auto"
            >
              <option value="">Vacío</option>
              {policySetsQuery.data!.map((ps) => (
                <option key={ps.id} value={ps.id}>{ps.name} ({ps.policyIds.length})</option>
              ))}
            </select>
            {appliedPolicySetName && (
              <span role="status" className="badge bg-neutral-900 text-white text-xs">
                Aplicado desde: {appliedPolicySetName}
              </span>
            )}
            <span className="text-xs text-neutral-400">Origen actual: {describeSource(selectionQuery.data?.source)}</span>
          </div>

          {previewPolicySet && (
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-neutral-900">{previewPolicySet.name}</p>
              {previewPolicySet.description && (
                <p className="text-xs text-neutral-500 mt-0.5">{previewPolicySet.description}</p>
              )}
              <p className="text-xs text-neutral-500 mt-2 mb-1.5">
                Incluye {previewPolicySet.policyNames.length} política{previewPolicySet.policyNames.length === 1 ? '' : 's'}:
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {previewPolicySet.policyNames.map((name) => (
                  <li key={name} className="badge bg-white border border-neutral-200 text-neutral-700 text-xs">{name}</li>
                ))}
              </ul>

              {applyPolicySetMutation.isError && (
                <p role="alert" className="text-xs text-red-600 mt-3">
                  {(applyPolicySetMutation.error as AxiosError<{ message?: string }>)?.response?.data?.message
                    ?? 'No se pudo aplicar el Policy Set.'}
                </p>
              )}

              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={onConfirmApplyPolicySet}
                  disabled={applyPolicySetMutation.isPending}
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  {applyPolicySetMutation.isPending ? 'Aplicando...' : 'Aplicar este Policy Set'}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPolicySetId(null)}
                  disabled={applyPolicySetMutation.isPending}
                  className="btn-outline text-xs px-3 py-1.5"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
                  <option key={framework} value={framework}>{FRAMEWORK_LABELS[framework] ?? framework}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-neutral-200 bg-white">
              <SelectAllCheckbox
                visibleIds={filteredPolicies.map((policy) => policy.id)}
                selectedIds={effectiveSelectedIds}
                onChange={onReplaceSelection}
                filtered={isFiltered}
              />
            </div>
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
                          <td className="table-td text-xs">{FRAMEWORK_LABELS[policy.framework] ?? policy.framework}</td>
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
            disabled={
              saveSelectionMutation.isPending ||
              (isDirty === false && (hasExistingSelection || Boolean(previewPolicySetId)))
            }
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
