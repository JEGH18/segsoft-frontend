import { Link, useParams } from 'react-router-dom';
import { usePolicy } from '@/hooks/usePolicies';
import { useAuth } from '@/store/authStore';
import RuleManagementSection from '@/components/policies/RuleManagementSection';

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

export default function PolicyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isAdmin = user?.roles.includes('SECURITY_ADMIN') ?? false;

  const { data: policy, isLoading, isError } = usePolicy(id);

  if (!id) return <div role="alert" className="text-sm text-red-600">Política no encontrada.</div>;

  if (isLoading) {
    return <p aria-live="polite" className="text-sm text-neutral-500">Cargando política...</p>;
  }

  if (isError || !policy) {
    return (
      <div>
        <Link to="/policies" className="nav-link inline-block mb-4">← Volver al banco de políticas</Link>
        <div role="alert" className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
          No se pudo cargar la política solicitada.
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link to="/policies" className="nav-link inline-block mb-4">← Volver al banco de políticas</Link>

      <div className="page-header flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{policy.name}</h1>
          <p className="page-subtitle">
            {CATEGORY_LABELS[policy.category] ?? policy.category} · {FRAMEWORK_LABELS[policy.framework] ?? policy.framework}
            {policy.controlId ? ` · ${policy.controlId}` : ''}
          </p>
        </div>
        <span
          role="status"
          aria-label={`Estado: ${STATUS_LABELS[policy.status] ?? policy.status}`}
          className={`badge ${policy.status === 'ACTIVE' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'}`}
        >
          {STATUS_LABELS[policy.status] ?? policy.status}
        </span>
      </div>

      <div className="card p-5">
        <p className="text-sm text-neutral-700 leading-relaxed mb-4">{policy.description}</p>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="form-label">Categoría (CCS)</dt>
            <dd className="text-neutral-900">{CATEGORY_LABELS[policy.category] ?? policy.category}</dd>
          </div>
          <div>
            <dt className="form-label">Marco normativo</dt>
            <dd className="text-neutral-900">{FRAMEWORK_LABELS[policy.framework] ?? policy.framework}</dd>
          </div>
          <div>
            <dt className="form-label">Control</dt>
            <dd className="font-mono text-xs text-neutral-900">{policy.controlId || '—'}</dd>
          </div>
          <div>
            <dt className="form-label">Peso</dt>
            <dd className="tabular-nums text-neutral-900">{policy.weight}</dd>
          </div>
          <div>
            <dt className="form-label">Versión</dt>
            <dd className="tabular-nums text-neutral-900">{policy.version}</dd>
          </div>
          <div>
            <dt className="form-label">Reglas activas</dt>
            <dd className="tabular-nums text-neutral-900">{policy.rulesCount}</dd>
          </div>
          <div>
            <dt className="form-label">Ejecutable</dt>
            <dd>
              <span
                className={`badge ${policy.executable ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'}`}
              >
                {policy.executable ? 'Sí' : 'No'}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <RuleManagementSection policyId={policy.id} isAdmin={isAdmin} />
    </div>
  );
}
