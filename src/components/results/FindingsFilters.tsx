import { Category, Severity } from '@/types/enums';
import type { FindingsFilters } from '@/types/analysis';

interface Props {
  filters: FindingsFilters;
  filePath: string;
  onFiltersChange: (filters: FindingsFilters) => void;
  onFilePathChange: (value: string) => void;
  policies: Array<{ id: string; name: string }>;
}

function toggleSeverity(current: Severity[], value: Severity): Severity[] {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

function toggleCategory(current: string[], value: string): string[] {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

const SEVERITY_ACTIVE: Record<Severity, string> = {
  CRITICAL: 'bg-neutral-900 text-white border-neutral-900',
  HIGH: 'bg-neutral-700 text-white border-neutral-700',
  MEDIUM: 'bg-neutral-400 text-white border-neutral-400',
  LOW: 'bg-neutral-200 text-neutral-700 border-neutral-300',
};

export default function FindingsFilters({
  filters,
  filePath,
  onFiltersChange,
  onFilePathChange,
  policies,
}: Props) {
  return (
    <section aria-label="Filtros de findings" className="card p-4 space-y-4">
      <div>
        <p className="form-label mb-2">Severidad</p>
        <div className="flex gap-2 flex-wrap">
          {Object.values(Severity).map((severity) => {
            const active = filters.severities.includes(severity);
            return (
              <button
                key={severity}
                type="button"
                aria-label={`Filtrar por severidad ${severity}`}
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    severities: toggleSeverity(filters.severities, severity),
                  })
                }
                className={`badge cursor-pointer border transition-colors ${
                  active
                    ? SEVERITY_ACTIVE[severity]
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                }`}
              >
                {severity}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="form-label mb-2">Categoría</p>
        <div className="flex gap-2 flex-wrap">
          {Object.values(Category).map((category) => {
            const active = filters.categories.includes(category);
            return (
              <button
                key={category}
                type="button"
                aria-label={`Filtrar por categoría ${category}`}
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    categories: toggleCategory(filters.categories, category),
                  })
                }
                className={`badge cursor-pointer border transition-colors text-xs ${
                  active
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div>
          <label htmlFor="filter-policy" className="form-label block mb-1">Política</label>
          <select
            id="filter-policy"
            aria-label="Filtrar por política"
            value={filters.policyId}
            onChange={(event) => onFiltersChange({ ...filters, policyId: event.target.value })}
            className="form-select w-auto"
          >
            <option value="">Todas</option>
            {policies.map((policy) => (
              <option key={policy.id} value={policy.id}>{policy.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-filepath" className="form-label block mb-1">Archivo</label>
          <input
            id="filter-filepath"
            aria-label="Filtrar por ruta de archivo"
            type="text"
            value={filePath}
            onChange={(event) => onFilePathChange(event.target.value)}
            placeholder="src/main/..."
            className="form-input w-64"
          />
        </div>
      </div>
    </section>
  );
}
