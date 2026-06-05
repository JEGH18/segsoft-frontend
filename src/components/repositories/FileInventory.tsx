import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRepositoryFiles } from '@/api/repositoryFiles';
import type { ArtifactType, FileInventoryFilters } from '@/types/repository';

const ARTIFACT_LABELS: Record<string, string> = {
  SOURCE_CODE: 'Código fuente',
  CONFIG: 'Configuración',
  DEPENDENCY_MANIFEST: 'Dependencias',
  DOCUMENTATION: 'Documentación',
  INFRASTRUCTURE_AS_CODE: 'Infraestructura',
};

const ARTIFACT_COLORS: Record<string, string> = {
  SOURCE_CODE: 'bg-neutral-900 text-white border-neutral-800',
  CONFIG: 'bg-neutral-200 text-neutral-700 border-neutral-300',
  DEPENDENCY_MANIFEST: 'bg-neutral-700 text-white border-neutral-600',
  DOCUMENTATION: 'bg-white text-neutral-600 border-neutral-200',
  INFRASTRUCTURE_AS_CODE: 'bg-neutral-400 text-white border-neutral-500',
};

const ARTIFACT_OPTIONS: ArtifactType[] = [
  'SOURCE_CODE',
  'CONFIG',
  'DEPENDENCY_MANIFEST',
  'DOCUMENTATION',
  'INFRASTRUCTURE_AS_CODE',
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  repositoryId: string;
}

export default function FileInventory({ repositoryId }: Props) {
  const [filters, setFilters] = useState<FileInventoryFilters>({
    language: '',
    artifactType: undefined,
    page: 0,
    size: 20,
  });

  const [languageInput, setLanguageInput] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isInventorying, setIsInventorying] = useState(false);

  const { data, status } = useQuery({
    queryKey: ['repository-files', repositoryId, filters],
    queryFn: async () => {
      const result = await getRepositoryFiles(repositoryId, {
        ...filters,
        language: filters.language || undefined,
      });
      setIsInventorying(result.status === 202);
      return result.data;
    },
    staleTime: 30_000,
    refetchInterval: isInventorying ? 3_000 : false,
  });

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters((f) => ({ ...f, language: languageInput.trim(), page: 0 }));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [languageInput]);

  const handleArtifactTypeChange = (value: string) => {
    setFilters((f) => ({
      ...f,
      artifactType: value ? (value as ArtifactType) : undefined,
      page: 0,
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters((f) => ({ ...f, page: newPage }));
  };

  const isLoading = status === 'pending';
  const isError = status === 'error';

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto p-6">

        <div className="page-header">
          <h1 className="page-title">Inventario de archivos</h1>
          <p className="page-subtitle">
            Repositorio: <code className="font-mono text-neutral-700">{repositoryId}</code>
          </p>
        </div>

        {isInventorying && (
          <div
            role="status"
            aria-live="polite"
            className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-700 text-sm"
          >
            <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <span>El inventario está en progreso. Actualizando automáticamente…</span>
          </div>
        )}

        {data?.inventoryStatus === 'FAILED' && (
          <div role="alert" className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
            El inventario falló. Por favor recargue el repositorio.
          </div>
        )}

        {data && !isInventorying && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" aria-label="Resumen del inventario">
            <div className="card p-4">
              <div className="text-2xl font-bold text-neutral-900">{data.totalFiles.toLocaleString()}</div>
              <div className="text-xs text-neutral-500 mt-1">Archivos totales</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-bold text-neutral-900">{Object.keys(data.byLanguage).length}</div>
              <div className="text-xs text-neutral-500 mt-1">Lenguajes detectados</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-bold text-neutral-900">{Object.keys(data.byArtifactType).length}</div>
              <div className="text-xs text-neutral-500 mt-1">Tipos de artefacto</div>
            </div>
            {data.excludedCount > 0 && (
              <div className="card p-4">
                <div className="text-2xl font-bold text-neutral-400">{data.excludedCount.toLocaleString()}</div>
                <div className="text-xs text-neutral-500 mt-1">Archivos excluidos</div>
              </div>
            )}
          </div>
        )}

        {data && !isInventorying && Object.keys(data.byLanguage).length > 0 && (
          <div className="mb-6" aria-label="Archivos por lenguaje">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Por lenguaje</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.byLanguage)
                .sort(([, a], [, b]) => b - a)
                .map(([lang, count]) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => {
                      setLanguageInput(lang);
                      setFilters((f) => ({ ...f, language: lang, page: 0 }));
                    }}
                    aria-pressed={filters.language === lang}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition ${
                      filters.language === lang
                        ? 'bg-neutral-900 border-neutral-900 text-white'
                        : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:bg-neutral-50'
                    }`}
                  >
                    {lang}
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${filters.language === lang ? 'bg-neutral-700' : 'bg-neutral-100'}`}>
                      {count}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}

        <div
          className="flex flex-wrap items-end gap-4 mb-4 p-4 card"
          role="search"
          aria-label="Filtros del inventario"
        >
          <div>
            <label htmlFor="language-filter" className="form-label block mb-1">Lenguaje</label>
            <input
              id="language-filter"
              type="text"
              placeholder="ej. java, python…"
              value={languageInput}
              onChange={(e) => setLanguageInput(e.target.value)}
              className="form-input w-44"
            />
          </div>

          <div>
            <label htmlFor="artifact-type-filter" className="form-label block mb-1">Tipo de artefacto</label>
            <select
              id="artifact-type-filter"
              value={filters.artifactType ?? ''}
              onChange={(e) => handleArtifactTypeChange(e.target.value)}
              className="form-select w-52"
            >
              <option value="">Todos los tipos</option>
              {ARTIFACT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{ARTIFACT_LABELS[opt]}</option>
              ))}
            </select>
          </div>

          {(filters.language || filters.artifactType) && (
            <button
              type="button"
              onClick={() => {
                setLanguageInput('');
                setFilters((f) => ({ ...f, language: '', artifactType: undefined, page: 0 }));
              }}
              className="btn-ghost"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-neutral-400" role="status" aria-live="polite">
            <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <span className="text-sm">Cargando inventario…</span>
          </div>
        )}

        {isError && (
          <div role="alert" className="py-8 text-center text-red-500 text-sm">
            No se pudo cargar el inventario. Intente nuevamente.
          </div>
        )}

        {!isLoading && !isError && data && (
          <>
            <div
              className="card overflow-hidden"
              role="region"
              aria-label="Lista de archivos inventariados"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label={`${data.totalElements} archivos en el repositorio`}>
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th scope="col" className="table-th">Ruta</th>
                      <th scope="col" className="table-th">Lenguaje</th>
                      <th scope="col" className="table-th">Tipo de artefacto</th>
                      <th scope="col" className="table-th text-right">Tamaño</th>
                      <th scope="col" className="table-th">SHA-256</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {data.files.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-neutral-500 text-sm">
                          No se encontraron archivos con los filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      data.files.map((file) => (
                        <tr key={file.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-neutral-700 max-w-xs truncate" title={file.path}>
                            {file.path}
                          </td>
                          <td className="px-4 py-3">
                            <span className="badge bg-neutral-100 text-neutral-700 border border-neutral-200">
                              {file.language}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`badge border ${ARTIFACT_COLORS[file.artifactType] ?? 'bg-neutral-100 text-neutral-700 border-neutral-200'}`}>
                              {ARTIFACT_LABELS[file.artifactType]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-neutral-500 text-xs tabular-nums">
                            {formatBytes(file.sizeBytes)}
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-xs text-neutral-400 font-mono" title={file.sha256}>
                              {file.sha256.substring(0, 12)}…
                            </code>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {data.totalPages > 1 && (
              <nav aria-label="Paginación del inventario" className="flex items-center justify-between mt-4">
                <button
                  type="button"
                  onClick={() => handlePageChange(data.page - 1)}
                  disabled={data.page === 0}
                  className="btn-outline text-xs px-3 py-1.5"
                >
                  ← Anterior
                </button>
                <span className="text-xs text-neutral-500" aria-live="polite">
                  Página {data.page + 1} de {data.totalPages} · {data.totalElements.toLocaleString()} archivos
                </span>
                <button
                  type="button"
                  onClick={() => handlePageChange(data.page + 1)}
                  disabled={data.page >= data.totalPages - 1}
                  className="btn-outline text-xs px-3 py-1.5"
                >
                  Siguiente →
                </button>
              </nav>
            )}

            <p className="mt-3 text-xs text-neutral-400" aria-live="polite">
              Mostrando {data.files.length} de {data.totalElements.toLocaleString()} archivos
              {filters.language && ` · lenguaje: "${filters.language}"`}
              {filters.artifactType && ` · tipo: "${ARTIFACT_LABELS[filters.artifactType]}"`}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
