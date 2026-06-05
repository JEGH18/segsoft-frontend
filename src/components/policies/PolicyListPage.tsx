import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { usePolicies } from '@/hooks/usePolicies';
import { useAuth } from '@/store/authStore';
import PolicyCreateForm from '@/components/policies/PolicyCreateForm';
import { Category, Framework } from '@/types/enums';
import type { PolicyFilters } from '@/types/policy';

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
  CLAUDE_CODE_SECURITY: 'Claude Code Security',
  DEVSECOPS: 'DevSecOps',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activa',
  ARCHIVED: 'Archivada',
  DEPRECATED: 'Deprecada',
};

const PAGE_SIZE = 10;

export default function PolicyListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.roles.includes('SECURITY_ADMIN') ?? false;
  const [showCreate, setShowCreate] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [debouncedName, setDebouncedName] = useState('');
  const [filters, setFilters] = useState<PolicyFilters>({ page: 0, size: PAGE_SIZE });

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedName(nameInput), 300);
    return () => clearTimeout(timeout);
  }, [nameInput]);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, name: debouncedName || undefined, page: 0 }));
  }, [debouncedName]);

  const { data, isLoading, isError, isFetching } = usePolicies(filters);

  const handleFilter = useCallback((key: keyof PolicyFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined, page: 0 }));
  }, []);

  const handlePage = useCallback((newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  }, []);

  const currentPage = filters.page ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  return (
    <div>
      <div className="page-header flex items-center justify-between gap-4">
        <h1 className="page-title">Banco de Políticas de Seguridad</h1>
        {isAdmin && (
          <button
            onClick={() => setShowCreate((v) => !v)}
            aria-expanded={showCreate}
            className={showCreate ? 'btn-outline' : 'btn-primary'}
          >
            {showCreate ? 'Cancelar' : '+ Nueva política'}
          </button>
        )}
      </div>

      {isAdmin && showCreate && (
        <div className="card p-5 mb-6">
          <h2 className="text-base font-semibold text-neutral-900 mb-4">Registrar nueva política</h2>
          <PolicyCreateForm
            onSuccess={(id) => {
              setShowCreate(false);
              qc.invalidateQueries({ queryKey: ['policies'] });
              navigate(`/policies/${id}`);
            }}
          />
        </div>
      )}

      <div className="card p-4 mb-6">
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            aria-label="Buscar política por nombre"
            className="form-input max-w-xs"
          />
          <select
            aria-label="Filtrar por categoría"
            defaultValue=""
            onChange={(e) => handleFilter('category', e.target.value)}
            className="form-select w-auto"
          >
            <option value="">Todas las categorías</option>
            {Object.values(Category).map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
            ))}
          </select>
          <select
            aria-label="Filtrar por marco normativo"
            defaultValue=""
            onChange={(e) => handleFilter('framework', e.target.value)}
            className="form-select w-auto"
          >
            <option value="">Todos los marcos</option>
            {Object.values(Framework).map((f) => (
              <option key={f} value={f}>{FRAMEWORK_LABELS[f] ?? f}</option>
            ))}
          </select>
          <select
            aria-label="Filtrar por estado"
            defaultValue=""
            onChange={(e) => handleFilter('status', e.target.value)}
            className="form-select w-auto"
          >
            <option value="">Todos los estados</option>
            {Object.keys(STATUS_LABELS).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      {isError && (
        <div role="alert" className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
          Error al cargar las políticas. Intente nuevamente.
        </div>
      )}

      {isLoading ? (
        <p aria-live="polite" className="text-sm text-neutral-500">Cargando políticas...</p>
      ) : (
        <>
          <p className="text-xs text-neutral-500 mb-3">
            {totalElements} política{totalElements !== 1 ? 's' : ''} encontrada{totalElements !== 1 ? 's' : ''}
            {isFetching && <span className="ml-2 text-neutral-400">(actualizando...)</span>}
          </p>

          {data?.content.length === 0 ? (
            <div className="card p-10 text-center text-sm text-neutral-500">
              No se encontraron políticas con los filtros aplicados.
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="table-th">Nombre</th>
                      <th className="table-th">Categoría</th>
                      <th className="table-th">Marco</th>
                      <th className="table-th">Control</th>
                      <th className="table-th">Estado</th>
                      <th className="table-th">Peso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {data?.content.map((policy) => (
                      <tr key={policy.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="table-td">
                          <button
                            onClick={() => navigate(`/policies/${policy.id}`)}
                            className="text-left font-medium text-neutral-900 hover:underline"
                          >
                            {policy.name}
                          </button>
                        </td>
                        <td className="table-td">{CATEGORY_LABELS[policy.category] ?? policy.category}</td>
                        <td className="table-td">{FRAMEWORK_LABELS[policy.framework] ?? policy.framework}</td>
                        <td className="table-td font-mono text-xs">{policy.controlId || '—'}</td>
                        <td className="table-td">
                          <span
                            role="status"
                            aria-label={`Estado: ${STATUS_LABELS[policy.status] ?? policy.status}`}
                            className={`badge ${
                              policy.status === 'ACTIVE'
                                ? 'bg-neutral-900 text-white'
                                : 'bg-neutral-100 text-neutral-500'
                            }`}
                          >
                            {STATUS_LABELS[policy.status] ?? policy.status}
                          </span>
                        </td>
                        <td className="table-td tabular-nums">{policy.weight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {totalPages > 1 && (
            <nav
              role="navigation"
              aria-label="Paginación de políticas"
              className="flex items-center gap-3 mt-4"
            >
              <button
                onClick={() => handlePage(currentPage - 1)}
                disabled={currentPage === 0}
                aria-label="Página anterior"
                className="btn-outline text-xs px-3 py-1.5"
              >
                ← Anterior
              </button>
              <span aria-live="polite" className="text-xs text-neutral-500">
                Página {currentPage + 1} de {totalPages}
              </span>
              <button
                onClick={() => handlePage(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
                aria-label="Página siguiente"
                className="btn-outline text-xs px-3 py-1.5"
              >
                Siguiente →
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
