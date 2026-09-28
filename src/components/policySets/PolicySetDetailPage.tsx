import { useEffect, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usePolicySet, useUpdatePolicySet, useArchivePolicySet, useRestorePolicySet, usePolicySetAuditLog } from '@/hooks/usePolicySets';
import { usePolicies } from '@/hooks/usePolicySelection';
import { useAuth } from '@/store/authStore';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Category, Framework } from '@/types/enums';

const CATEGORY_LABELS: Record<string, string> = {
  SQL_INJECTION: 'SQL Injection',
  XSS: 'XSS',
  AUTHENTICATION_FAILURE: 'Fallo de Autenticación',
  INSECURE_DATA_HANDLING: 'Manejo Inseguro de Datos',
  DEPENDENCY_VULNERABILITY: 'Vulnerabilidad en Dependencias',
};

const FRAMEWORK_LABELS: Record<string, string> = {
  ISO_27001: 'ISO 27001',
  OWASP_TOP_10_2021: 'OWASP Top 10 2021',
  OWASP_ASVS: 'OWASP ASVS',
  NIST_SP_800_53: 'NIST SP 800-53',
  CUSTOM: 'Personalizado',
  DEVSECOPS: 'DevSecOps',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  ARCHIVED: 'Archivado',
};

const ACTION_LABELS: Record<string, string> = {
  POLICY_SET_CREATED: 'Creado',
  POLICY_SET_UPDATED: 'Editado',
  POLICY_SET_ARCHIVED: 'Archivado',
  POLICY_SET_RESTORED: 'Restaurado',
};

const ACTION_COLORS: Record<string, string> = {
  POLICY_SET_CREATED: 'bg-neutral-900 text-white',
  POLICY_SET_UPDATED: 'bg-[#fab219] text-neutral-900',
  POLICY_SET_ARCHIVED: 'bg-[#d03b3b] text-white',
  POLICY_SET_RESTORED: 'bg-[#0ca30c] text-neutral-900',
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const ALL_CATEGORIES = [
  Category.SQL_INJECTION,
  Category.XSS,
  Category.AUTHENTICATION_FAILURE,
  Category.INSECURE_DATA_HANDLING,
  Category.DEPENDENCY_VULNERABILITY,
];

export default function PolicySetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.roles.includes('SECURITY_ADMIN') ?? false;

  const { data: policySet, isLoading, isError } = usePolicySet(id);
  const { data: auditLog } = usePolicySetAuditLog(id);
  const policiesQuery = usePolicies();
  const updateMutation = useUpdatePolicySet(id ?? '');
  const archiveMutation = useArchivePolicySet(id ?? '');
  const restoreMutation = useRestorePolicySet(id ?? '');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'archive' | 'restore' | null>(null);

  useEffect(() => {
    if (!policySet) return;
    setName(policySet.name);
    setDescription(policySet.description ?? '');
    setSelectedIds(policySet.policyIds);
  }, [policySet]);

  const activePolicies = useMemo(
    () => (policiesQuery.data?.content ?? []).filter((p) => p.status === 'ACTIVE'),
    [policiesQuery.data],
  );

  const filteredPolicies = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return activePolicies;
    return activePolicies.filter((p) => p.name.toLowerCase().includes(term));
  }, [activePolicies, search]);

  if (!id) return <div role="alert" className="text-sm text-red-600">Policy Set no encontrado.</div>;

  if (isLoading) {
    return <p aria-live="polite" className="text-sm text-neutral-500">Cargando Policy Set...</p>;
  }

  if (isError || !policySet) {
    return (
      <div>
        <Link to="/policy-sets" className="nav-link inline-block mb-4">← Volver a Policy Sets</Link>
        <div role="alert" className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
          No se pudo cargar el Policy Set solicitado.
        </div>
      </div>
    );
  }

  const canEdit = isAdmin && policySet.status === 'ACTIVE';
  const sortedSelectedIds = [...selectedIds].sort();
  const sortedOriginalIds = [...policySet.policyIds].sort();
  const isDirty =
    name !== policySet.name ||
    description !== (policySet.description ?? '') ||
    JSON.stringify(sortedSelectedIds) !== JSON.stringify(sortedOriginalIds);

  function toggle(policyId: string) {
    setSaveSuccess(false);
    setSelectedIds((prev) =>
      prev.includes(policyId) ? prev.filter((pid) => pid !== policyId) : [...prev, policyId],
    );
  }

  async function handleSave() {
    if (!policySet) return;
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await updateMutation.mutateAsync({
        name: name !== policySet.name ? name.trim() : undefined,
        description: description !== (policySet.description ?? '') ? description.trim() : undefined,
        policyIds: JSON.stringify(sortedSelectedIds) !== JSON.stringify(sortedOriginalIds) ? selectedIds : undefined,
      });
      setSaveSuccess(true);
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setSaveError(axiosErr.response?.data?.message ?? 'No se pudo guardar los cambios.');
    }
  }

  async function handleConfirmedAction() {
    if (confirmAction === 'archive') {
      try {
        await archiveMutation.mutateAsync();
        setConfirmAction(null);
      } catch (err: unknown) {
        const axiosErr = err as AxiosError<{ message?: string }>;
        setSaveError(axiosErr.response?.data?.message ?? 'No se pudo archivar el Policy Set.');
        setConfirmAction(null);
      }
    } else if (confirmAction === 'restore') {
      try {
        await restoreMutation.mutateAsync();
        setConfirmAction(null);
      } catch (err: unknown) {
        const axiosErr = err as AxiosError<{ message?: string }>;
        setSaveError(axiosErr.response?.data?.message ?? 'No se pudo restaurar el Policy Set.');
        setConfirmAction(null);
      }
    }
  }

  return (
    <div>
      <Link to="/policy-sets" className="nav-link inline-block mb-4">← Volver a Policy Sets</Link>

      <div className="page-header flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{policySet.name}</h1>
          <p className="page-subtitle">
            {policySet.policyIds.length} política{policySet.policyIds.length === 1 ? '' : 's'} · versión {policySet.version}
            {' · '}aplicado a {policySet.usageCount} repositorio{policySet.usageCount === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            role="status"
            aria-label={`Estado: ${STATUS_LABELS[policySet.status] ?? policySet.status}`}
            className={`badge ${
              policySet.status === 'ACTIVE'
                ? 'bg-[#0ca30c] text-neutral-900'
                : 'bg-[#d03b3b] text-white'
            }`}
          >
            {STATUS_LABELS[policySet.status] ?? policySet.status}
          </span>
          {policySet.status === 'ACTIVE' && (
            <button
              type="button"
              onClick={() => navigate(`/?policySet=${policySet.id}`)}
              className="btn-primary text-xs px-3 py-1.5"
            >
              Aplicar a repositorio
            </button>
          )}
          {isAdmin && policySet.status === 'ACTIVE' && (
            <button
              type="button"
              onClick={() => setConfirmAction('archive')}
              className="btn-outline text-xs px-3 py-1.5"
            >
              Archivar
            </button>
          )}
          {isAdmin && policySet.status === 'ARCHIVED' && (
            <button
              type="button"
              onClick={() => setConfirmAction('restore')}
              className="btn-outline text-xs px-3 py-1.5"
            >
              Restaurar
            </button>
          )}
        </div>
      </div>

      <div className="card p-5 mb-5">
        <h2 className="text-sm font-semibold text-neutral-900 mb-4">Cobertura por categoría</h2>
        <ul className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {ALL_CATEGORIES.map((category) => {
            const count = policySet.categoryCoverage[category] ?? 0;
            return (
              <li key={category} className="text-center">
                <span
                  className={`badge w-full justify-center text-xs ${count > 0 ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-400'}`}
                >
                  {count}
                </span>
                <p className="text-xs text-neutral-500 mt-1.5">{CATEGORY_LABELS[category] ?? category}</p>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="card p-5 space-y-5">
        {!isAdmin && (
          <p className="text-xs text-neutral-400">Solo SECURITY_ADMIN puede editar Policy Sets.</p>
        )}
        {isAdmin && policySet.status !== 'ACTIVE' && (
          <p className="text-xs text-neutral-400">Este Policy Set está archivado y no se puede editar.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="policyset-name" className="form-label block mb-1.5">Nombre</label>
            <input
              id="policyset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit}
              className="form-input w-full disabled:bg-neutral-50 disabled:text-neutral-500"
            />
          </div>
          <div>
            <label htmlFor="policyset-version" className="form-label block mb-1.5">Versión</label>
            <p id="policyset-version" className="tabular-nums text-sm text-neutral-900 px-1 py-2">{policySet.version}</p>
          </div>
        </div>

        <div>
          <label htmlFor="policyset-description" className="form-label block mb-1.5">Descripción</label>
          <textarea
            id="policyset-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canEdit}
            rows={2}
            className="form-textarea w-full disabled:bg-neutral-50 disabled:text-neutral-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="form-label">Composición</span>
            <span className="text-xs text-neutral-500">{selectedIds.length} política{selectedIds.length === 1 ? '' : 's'} seleccionada{selectedIds.length === 1 ? '' : 's'}</span>
          </div>

          {canEdit && (
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar política..."
              aria-label="Buscar política por nombre"
              className="form-input max-w-xs mb-3"
            />
          )}

          {canEdit ? (
            policiesQuery.isLoading ? (
              <p className="text-sm text-neutral-500">Cargando políticas...</p>
            ) : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Políticas activas disponibles</caption>
                    <thead className="bg-neutral-50 border-b border-neutral-200 sticky top-0">
                      <tr>
                        <th className="table-th w-12">Sel.</th>
                        <th className="table-th">Nombre</th>
                        <th className="table-th">Categoría</th>
                        <th className="table-th">Marco</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {filteredPolicies.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-sm text-neutral-500">
                            No hay políticas activas para el filtro aplicado.
                          </td>
                        </tr>
                      ) : (
                        filteredPolicies.map((policy) => {
                          const isSelected = selectedIds.includes(policy.id);
                          return (
                            <tr
                              key={policy.id}
                              className={`cursor-pointer transition-colors ${isSelected ? 'bg-neutral-50' : 'hover:bg-neutral-50'}`}
                              onClick={() => toggle(policy.id)}
                            >
                              <td className="table-td">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggle(policy.id)}
                                  aria-label={`Seleccionar ${policy.name}`}
                                  className="w-4 h-4 rounded border-neutral-300 accent-neutral-900"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                              <td className="table-td font-medium text-neutral-900">{policy.name}</td>
                              <td className="table-td text-xs">{CATEGORY_LABELS[policy.category as Category] ?? policy.category}</td>
                              <td className="table-td text-xs">{FRAMEWORK_LABELS[policy.framework as Framework] ?? policy.framework}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            <ul className="space-y-1.5">
              {policySet.policies.length === 0 ? (
                <li className="text-sm text-neutral-400">Sin políticas.</li>
              ) : (
                policySet.policies.map((policy) => (
                  <li
                    key={policy.id}
                    className="flex flex-wrap items-center gap-2 text-sm text-neutral-700 px-3 py-1.5 bg-neutral-50 rounded-lg"
                  >
                    <span className="font-medium text-neutral-900">{policy.name}</span>
                    <span className="text-xs text-neutral-400">
                      {CATEGORY_LABELS[policy.category as Category] ?? policy.category}
                      {' · '}
                      {FRAMEWORK_LABELS[policy.framework as Framework] ?? policy.framework}
                    </span>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        {saveError && (
          <div role="alert" className="px-3 py-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg">
            {saveError}
          </div>
        )}
        {saveSuccess && !isDirty && (
          <div role="status" className="px-3 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs rounded-lg">
            Cambios guardados. Nueva versión: {policySet.version}.
          </div>
        )}

        {canEdit && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || selectedIds.length === 0 || updateMutation.isPending}
              className="btn-primary text-sm px-4 py-2"
            >
              {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </div>

      <div className="card p-5 mt-5">
        <h2 className="text-sm font-semibold text-neutral-900 mb-4">Historial de cambios</h2>
        {!auditLog || auditLog.length === 0 ? (
          <p className="text-xs text-neutral-400">Sin eventos registrados todavía.</p>
        ) : (
          <ul className="space-y-3">
            {auditLog.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3 text-sm border-b border-neutral-100 pb-3 last:border-0 last:pb-0">
                <span className={`badge shrink-0 ${ACTION_COLORS[entry.action] ?? 'bg-neutral-100 text-neutral-500'}`}>
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-neutral-700">
                    <span className="font-medium text-neutral-900">{entry.username ?? 'usuario desconocido'}</span>
                    {entry.userId && (
                      <span className="text-neutral-400 font-mono text-xs ml-1.5">({entry.userId})</span>
                    )}
                    <span className="text-neutral-400 mx-1.5">·</span>
                    <span className="text-neutral-500">{formatTimestamp(entry.timestamp)}</span>
                  </p>
                  {Object.keys(entry.payload ?? {}).length > 0 && (
                    <pre className="mt-1 text-xs font-mono text-neutral-500 bg-neutral-50 rounded px-2 py-1.5 overflow-x-auto">
                      {JSON.stringify(entry.payload, null, 2)}
                    </pre>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction === 'archive' ? 'Archivar Policy Set' : 'Restaurar Policy Set'}
        message={
          confirmAction === 'archive'
            ? 'El Policy Set dejará de aparecer en el listado por defecto y no podrá aplicarse a nuevos repositorios. No se elimina físicamente ni se pierde la trazabilidad de los análisis que ya lo usaron. Si hay un análisis en curso sobre un repositorio que lo aplicó, el archivado se rechaza.'
            : 'El Policy Set volverá a estado ACTIVE y podrá aplicarse a repositorios de inmediato.'
        }
        confirmLabel={confirmAction === 'archive' ? 'Archivar' : 'Restaurar'}
        destructive={confirmAction === 'archive'}
        loading={archiveMutation.isPending || restoreMutation.isPending}
        onConfirm={handleConfirmedAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
