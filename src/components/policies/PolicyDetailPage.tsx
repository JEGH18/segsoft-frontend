import { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { Link, useParams } from 'react-router-dom';
import { usePolicy, useUpdatePolicy, useArchivePolicy, useRestorePolicy, usePolicyAuditLog, usePolicyTraceability } from '@/hooks/usePolicies';
import { useIso27002Controls } from '@/hooks/useIso27002Controls';
import { useAuth } from '@/store/authStore';
import RuleManagementSection from '@/components/policies/RuleManagementSection';
import ConfirmDialog from '@/components/common/ConfirmDialog';

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
  ACTIVE: 'Activa',
  ARCHIVED: 'Archivada',
  DEPRECATED: 'Deprecada',
};

const IMMUTABLE_TOOLTIP = 'No editable: cambiar esto redefine a qué política pertenece. Crea una política nueva en su lugar.';

const ACTION_LABELS: Record<string, string> = {
  POLICY_CREATED: 'Creada',
  POLICY_UPDATED: 'Editada',
  POLICY_ARCHIVED: 'Archivada',
  POLICY_RESTORED: 'Restaurada',
};

const ACTION_COLORS: Record<string, string> = {
  POLICY_CREATED: 'bg-neutral-900 text-white',
  POLICY_UPDATED: 'bg-[#fab219] text-neutral-900',
  POLICY_ARCHIVED: 'bg-[#d03b3b] text-white',
  POLICY_RESTORED: 'bg-[#0ca30c] text-neutral-900',
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function PolicyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isAdmin = user?.roles.includes('SECURITY_ADMIN') ?? false;

  const { data: policy, isLoading, isError } = usePolicy(id);
  const { data: auditLog } = usePolicyAuditLog(id);
  const { data: traceability } = usePolicyTraceability(id);
  const updateMutation = useUpdatePolicy(id ?? '');
  const archiveMutation = useArchivePolicy(id ?? '');
  const restoreMutation = useRestorePolicy(id ?? '');

  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState(50);
  const [applicabilityText, setApplicabilityText] = useState('{}');
  const [applicabilityError, setApplicabilityError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'archive' | 'restore' | null>(null);
  const [selectedGuideId, setSelectedGuideId] = useState('');
  const [guideSaveError, setGuideSaveError] = useState<string | null>(null);
  const [guideSaveSuccess, setGuideSaveSuccess] = useState(false);

  const { data: iso27002Guides = [], isLoading: iso27002GuidesLoading } = useIso27002Controls(
    policy?.detailPending ? policy.controlId ?? undefined : undefined,
  );

  useEffect(() => {
    if (!policy) return;
    setDescription(policy.description ?? '');
    setWeight(policy.weight);
    setApplicabilityText(JSON.stringify(policy.applicability ?? {}, null, 2));
    setApplicabilityError(null);
  }, [policy]);

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

  const canEdit = isAdmin && policy.status === 'ACTIVE';
  const isDirty =
    description !== (policy.description ?? '') ||
    weight !== policy.weight ||
    applicabilityText !== JSON.stringify(policy.applicability ?? {}, null, 2);

  function handleApplicabilityChange(value: string) {
    setApplicabilityText(value);
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setApplicabilityError('Debe ser un objeto JSON, ej. {}');
      } else {
        setApplicabilityError(null);
      }
    } catch {
      setApplicabilityError('JSON inválido');
    }
  }

  async function handleSave() {
    if (!policy || applicabilityError) return;
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await updateMutation.mutateAsync({
        data: {
          description,
          weight,
          applicability: JSON.parse(applicabilityText),
        },
        ifMatchVersion: policy.version,
      });
      setSaveSuccess(true);
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ errorCode?: string; message?: string }>;
      if (axiosErr.response?.status === 412) {
        setSaveError('Esta política fue modificada por alguien más mientras la editabas. Recarga la página para ver la versión actual.');
      } else {
        setSaveError(axiosErr.response?.data?.message ?? 'No se pudo guardar los cambios.');
      }
    }
  }

  async function handleSaveGuide() {
    if (!policy || !selectedGuideId) return;
    setGuideSaveError(null);
    setGuideSaveSuccess(false);
    try {
      await updateMutation.mutateAsync({
        data: { implementationGuideId: selectedGuideId },
        ifMatchVersion: policy.version,
      });
      setGuideSaveSuccess(true);
      setSelectedGuideId('');
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setGuideSaveError(axiosErr.response?.data?.message ?? 'No se pudo guardar la guía de implementación.');
    }
  }

  async function handleConfirmedAction() {
    if (confirmAction === 'archive') {
      try {
        await archiveMutation.mutateAsync();
        setConfirmAction(null);
      } catch (err: unknown) {
        const axiosErr = err as AxiosError<{ message?: string }>;
        setSaveError(axiosErr.response?.data?.message ?? 'No se pudo archivar la política.');
        setConfirmAction(null);
      }
    } else if (confirmAction === 'restore') {
      await restoreMutation.mutateAsync();
      setConfirmAction(null);
    }
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
        <div className="flex items-center gap-2 shrink-0">
          <span
            role="status"
            aria-label={`Estado: ${STATUS_LABELS[policy.status] ?? policy.status}`}
            className={`badge ${
              policy.status === 'ACTIVE'
                ? 'bg-[#0ca30c] text-neutral-900'
                : policy.status === 'ARCHIVED'
                ? 'bg-[#d03b3b] text-white'
                : 'bg-[#fab219] text-neutral-900'
            }`}
          >
            {STATUS_LABELS[policy.status] ?? policy.status}
          </span>
          {isAdmin && policy.status === 'ACTIVE' && (
            <button
              type="button"
              onClick={() => setConfirmAction('archive')}
              className="btn-outline text-xs px-3 py-1.5"
            >
              Archivar
            </button>
          )}
          {isAdmin && policy.status === 'ARCHIVED' && (
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

      {policy.detailPending && (
        <div role="alert" className="card p-5 mb-5 border-2 border-[#fab219] bg-[#fffbea]">
          <p className="font-semibold text-neutral-900 mb-1">⚠ Detalle de ISO/IEC 27002 pendiente</p>
          <p className="text-sm text-neutral-700 mb-3">
            Esta política solo tiene el control genérico del Anexo A ({policy.controlId}). Completa la guía de
            implementación de ISO/IEC 27002 para que cubra el nivel de detalle que exige una auditoría real.
          </p>
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedGuideId}
                onChange={(e) => setSelectedGuideId(e.target.value)}
                disabled={iso27002GuidesLoading}
                aria-label="Guía de implementación ISO/IEC 27002"
                className="form-select max-w-lg"
              >
                <option value="">
                  {iso27002GuidesLoading ? 'Cargando guías...' : '-- Elegir guía de implementación --'}
                </option>
                {iso27002Guides.map((g) => (
                  <option key={g.id} value={g.id}>{g.id} — {g.title}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleSaveGuide}
                disabled={!selectedGuideId || updateMutation.isPending}
                className="btn-primary text-xs px-3 py-1.5"
              >
                {updateMutation.isPending ? 'Guardando...' : 'Completar detalle'}
              </button>
            </div>
          )}
          {guideSaveError && (
            <p role="alert" className="text-xs text-red-600 mt-2">{guideSaveError}</p>
          )}
          {guideSaveSuccess && (
            <p role="status" className="text-xs text-neutral-700 mt-2">Guía de implementación guardada.</p>
          )}
        </div>
      )}

      <div className="card p-5 space-y-5">
        {!isAdmin && (
          <p className="text-xs text-neutral-400">Solo SECURITY_ADMIN puede editar políticas.</p>
        )}
        {isAdmin && policy.status !== 'ACTIVE' && (
          <p className="text-xs text-neutral-400">Esta política está {STATUS_LABELS[policy.status]?.toLowerCase()} y no se puede editar. Restáurala primero.</p>
        )}

        <div>
          <label htmlFor="policy-description" className="form-label block mb-1.5">Descripción</label>
          <textarea
            id="policy-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canEdit}
            rows={3}
            className="form-textarea w-full disabled:bg-neutral-50 disabled:text-neutral-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="policy-weight" className="form-label block mb-1.5">Peso de criticidad (1-100)</label>
            <input
              id="policy-weight"
              type="number"
              min={1}
              max={100}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              disabled={!canEdit}
              className="form-input w-32 disabled:bg-neutral-50 disabled:text-neutral-500"
            />
            <p className="text-xs text-neutral-400 mt-1">Usado en el cálculo de cumplimiento ponderado.</p>
          </div>
          <div>
            <label htmlFor="policy-version" className="form-label block mb-1.5">Versión</label>
            <p id="policy-version" className="tabular-nums text-sm text-neutral-900 px-1 py-2">{policy.version}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="policy-framework" className="form-label block mb-1.5">Marco normativo</label>
            <input
              id="policy-framework"
              value={FRAMEWORK_LABELS[policy.framework] ?? policy.framework}
              disabled
              title={IMMUTABLE_TOOLTIP}
              className="form-input w-full bg-neutral-50 text-neutral-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label htmlFor="policy-control" className="form-label block mb-1.5">Control</label>
            <input
              id="policy-control"
              value={policy.controlId ?? '—'}
              disabled
              title={IMMUTABLE_TOOLTIP}
              className="form-input w-full bg-neutral-50 text-neutral-500 cursor-not-allowed font-mono text-xs"
            />
          </div>
          <div>
            <label htmlFor="policy-category" className="form-label block mb-1.5">Categoría (CCS)</label>
            <input
              id="policy-category"
              value={CATEGORY_LABELS[policy.category] ?? policy.category}
              disabled
              title={IMMUTABLE_TOOLTIP}
              className="form-input w-full bg-neutral-50 text-neutral-500 cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label htmlFor="policy-applicability" className="form-label block mb-1.5">
            Aplicabilidad <span className="text-neutral-400 font-normal">(JSON)</span>
          </label>
          <textarea
            id="policy-applicability"
            value={applicabilityText}
            onChange={(e) => handleApplicabilityChange(e.target.value)}
            disabled={!canEdit}
            rows={3}
            spellCheck={false}
            className="form-textarea w-full font-mono text-xs disabled:bg-neutral-50 disabled:text-neutral-500"
          />
          {applicabilityError && (
            <p className="text-xs text-red-600 mt-1">{applicabilityError}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="form-label">Reglas activas</p>
            <p className="tabular-nums text-neutral-900">{policy.rulesCount}</p>
          </div>
          <div>
            <p className="form-label">Ejecutable</p>
            <span className={`badge ${policy.executable ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'}`}>
              {policy.executable ? 'Sí' : 'No'}
            </span>
          </div>
        </div>

        {saveError && (
          <div role="alert" className="px-3 py-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg">
            {saveError}
          </div>
        )}
        {saveSuccess && !isDirty && (
          <div role="status" className="px-3 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs rounded-lg">
            Cambios guardados. Nueva versión: {policy.version}.
          </div>
        )}

        {canEdit && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || Boolean(applicabilityError) || updateMutation.isPending}
              className="btn-primary text-sm px-4 py-2"
            >
              {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </div>

      {traceability && (
        <div className="card p-5 mt-5">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4">Trazabilidad</h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                Control del Anexo A (ISO/IEC 27001)
              </p>
              <p className="text-neutral-700">
                <span className="font-mono font-medium">{traceability.annexAControl.id}</span>
                {traceability.annexAControl.name && ` — ${traceability.annexAControl.name}`}
              </p>
            </div>
            {traceability.implementationGuide ? (
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                  Guía de implementación (ISO/IEC 27002)
                </p>
                <p className="text-neutral-700 mb-1">
                  <span className="font-mono font-medium">{traceability.implementationGuide.id}</span>
                  {' — '}{traceability.implementationGuide.title}
                </p>
                <p className="text-xs text-neutral-500">{traceability.implementationGuide.guidance}</p>
              </div>
            ) : (
              <p className="text-xs text-neutral-400">Sin guía de implementación de ISO/IEC 27002 asociada.</p>
            )}
          </div>
        </div>
      )}

      <RuleManagementSection policyId={policy.id} isAdmin={isAdmin} />

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
        title={confirmAction === 'archive' ? 'Archivar política' : 'Restaurar política'}
        message={
          confirmAction === 'archive'
            ? 'La política dejará de aparecer en listados y sugerencias por defecto, y no podrá seleccionarse para nuevos análisis. No se elimina físicamente ni se pierde la trazabilidad de análisis históricos.'
            : 'La política volverá a estado ACTIVE y podrá seleccionarse para nuevos análisis.'
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
