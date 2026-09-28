import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { usePolicySetCatalog } from '@/hooks/usePolicySets';
import { useAuth } from '@/store/authStore';
import PolicySetCreateForm from '@/components/policySets/PolicySetCreateForm';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  ARCHIVED: 'Archivado',
};

const PAGE_SIZE = 10;

export default function PolicySetListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.roles.includes('SECURITY_ADMIN') ?? false;

  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  // Debounce the search box so every keystroke doesn't fire a request.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Filter/search changes should always land back on the first page.
  useEffect(() => {
    setPage(0);
  }, [statusFilter, search]);

  const { data, isLoading, isError, isFetching } = usePolicySetCatalog({
    status: statusFilter,
    search: search || undefined,
    page,
    size: PAGE_SIZE,
  });
  const policySets = data?.content;

  return (
    <div>
      <div className="page-header flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Policy Sets</h1>
          <p className="page-subtitle">Conjuntos reutilizables de políticas activas, para estandarizar perfiles de cumplimiento.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate((v) => !v)}
            aria-expanded={showCreate}
            className={showCreate ? 'btn-outline' : 'btn-primary'}
          >
            {showCreate ? 'Cancelar' : '+ Nuevo Policy Set'}
          </button>
        )}
      </div>

      {isAdmin && showCreate && (
        <div className="card p-5 mb-6">
          <h2 className="text-base font-semibold text-neutral-900 mb-4">Crear Policy Set</h2>
          <PolicySetCreateForm
            onSuccess={(id) => {
              setShowCreate(false);
              qc.invalidateQueries({ queryKey: ['policy-sets'] });
              qc.invalidateQueries({ queryKey: ['policy-sets-catalog'] });
              navigate(`/policy-sets/${id}`);
            }}
          />
        </div>
      )}

      <div className="card p-4 mb-6">
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar Policy Set por nombre..."
            aria-label="Buscar Policy Set por nombre"
            className="form-input max-w-xs"
          />
          <select
            aria-label="Filtrar por estado"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ACTIVE' | 'ARCHIVED')}
            className="form-select w-auto"
          >
            <option value="ACTIVE">Activos</option>
            <option value="ARCHIVED">Archivados</option>
          </select>
        </div>
      </div>

      {isError && (
        <div role="alert" className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
          Error al cargar los Policy Sets. Intente nuevamente.
        </div>
      )}

      {isLoading ? (
        <p aria-live="polite" className="text-sm text-neutral-500">Cargando Policy Sets...</p>
      ) : (
        <>
          <p className="text-xs text-neutral-500 mb-3">
            {data?.totalElements ?? 0} Policy Set{(data?.totalElements ?? 0) !== 1 ? 's' : ''}
            {isFetching && <span className="ml-2 text-neutral-400">(actualizando...)</span>}
          </p>

          {!policySets || policySets.length === 0 ? (
            <div className="card p-10 text-center text-sm text-neutral-500">
              {data?.message ?? `No hay Policy Sets ${statusFilter === 'ACTIVE' ? 'activos' : 'archivados'} para el filtro aplicado.`}
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="table-th">Nombre</th>
                      <th className="table-th">Descripción</th>
                      <th className="table-th">Políticas</th>
                      <th className="table-th">Estado</th>
                      <th className="table-th">Versión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {policySets.map((ps) => (
                      <tr key={ps.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="table-td">
                          <button
                            onClick={() => navigate(`/policy-sets/${ps.id}`)}
                            className="text-left font-medium text-neutral-900 hover:underline"
                          >
                            {ps.name}
                          </button>
                        </td>
                        <td className="table-td text-neutral-500 max-w-xs truncate">{ps.description || '—'}</td>
                        <td className="table-td tabular-nums">{ps.policyIds.length}</td>
                        <td className="table-td">
                          <span
                            role="status"
                            aria-label={`Estado: ${STATUS_LABELS[ps.status] ?? ps.status}`}
                            className={`badge ${
                              ps.status === 'ACTIVE'
                                ? 'bg-[#0ca30c] text-neutral-900'
                                : 'bg-[#d03b3b] text-white'
                            }`}
                          >
                            {STATUS_LABELS[ps.status] ?? ps.status}
                          </span>
                        </td>
                        <td className="table-td tabular-nums">{ps.version}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data && data.totalPages > 1 && (
            <nav aria-label="Paginación de Policy Sets" className="flex items-center justify-center gap-3 mt-4">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn-outline text-xs px-3 py-1.5"
              >
                ← Anterior
              </button>
              <span aria-live="polite" className="text-xs text-neutral-500">
                Página {page + 1} de {data.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(data.totalPages - 1, p + 1))}
                disabled={page >= data.totalPages - 1}
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
