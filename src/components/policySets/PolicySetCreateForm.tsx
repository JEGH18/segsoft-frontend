import { useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import { usePolicies } from '@/hooks/usePolicySelection';
import { useCreatePolicySet } from '@/hooks/usePolicySets';
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

interface PolicySetCreateFormProps {
  onSuccess?: (id: string) => void;
}

export default function PolicySetCreateForm({ onSuccess }: PolicySetCreateFormProps) {
  const policiesQuery = usePolicies();
  const createMutation = useCreatePolicySet();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [nameError, setNameError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const activePolicies = useMemo(
    () => (policiesQuery.data?.content ?? []).filter((p) => p.status === 'ACTIVE'),
    [policiesQuery.data],
  );

  const filteredPolicies = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return activePolicies;
    return activePolicies.filter((p) => p.name.toLowerCase().includes(term));
  }, [activePolicies, search]);

  function toggle(policyId: string) {
    setSelectedIds((prev) =>
      prev.includes(policyId) ? prev.filter((id) => id !== policyId) : [...prev, policyId],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setNameError(null);

    if (!name.trim()) {
      setNameError('El nombre es obligatorio');
      return;
    }
    if (selectedIds.length === 0) {
      setServerError('Debe incluir al menos una política.');
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        policyIds: selectedIds,
      });
      setName('');
      setDescription('');
      setSelectedIds([]);
      onSuccess?.(created.id);
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setServerError(axiosErr.response?.data?.message ?? 'No se pudo crear el Policy Set.');
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Formulario de creación de Policy Set" className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="policyset-name" className="form-label block mb-1.5">Nombre *</label>
          <input
            id="policyset-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ej. Perfil PDG ICESI"
            className={`form-input ${nameError ? 'border-red-400 focus:ring-red-400' : ''}`}
          />
          {nameError && <p role="alert" className="field-error">{nameError}</p>}
        </div>
        <div>
          <label htmlFor="policyset-description" className="form-label block mb-1.5">
            Descripción <span className="text-neutral-400 font-normal">(opcional)</span>
          </label>
          <input
            id="policyset-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ej. Conjunto base para validación de proyectos de grado"
            className="form-input"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="policyset-search" className="form-label">Políticas activas del banco *</label>
          <span className="text-xs text-neutral-500">{selectedIds.length} seleccionada{selectedIds.length === 1 ? '' : 's'}</span>
        </div>
        <input
          id="policyset-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar política..."
          aria-label="Buscar política por nombre"
          className="form-input max-w-xs mb-3"
        />

        {policiesQuery.isLoading ? (
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
        )}
      </div>

      {serverError && (
        <div role="alert" aria-live="assertive" className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
          {serverError}
        </div>
      )}

      <button type="submit" disabled={createMutation.isPending} aria-busy={createMutation.isPending} className="btn-primary">
        {createMutation.isPending ? 'Creando...' : 'Crear Policy Set'}
      </button>
    </form>
  );
}
