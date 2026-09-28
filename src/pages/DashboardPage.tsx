import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { uploadZip, cloneGit } from '@/api/repositories';
import { usePolicies } from '@/hooks/usePolicySelection';
import { usePolicySets } from '@/hooks/usePolicySets';
import { Framework } from '@/types/enums';
import type { SourceType } from '@/types/repository';

const FRAMEWORK_LABELS: Record<Framework, string> = {
  [Framework.OWASP_TOP_10_2021]: 'OWASP Top 10',
  [Framework.ISO_27001]: 'ISO 27001',
  [Framework.OWASP_ASVS]: 'OWASP ASVS',
  [Framework.NIST_SP_800_53]: 'NIST SP 800-53',
  [Framework.DEVSECOPS]: 'DevSecOps',
  [Framework.CUSTOM]: 'Personalizado',
};

const FRAMEWORK_DESCRIPTIONS: Record<Framework, string> = {
  [Framework.OWASP_TOP_10_2021]: 'Vulnerabilidades más críticas en aplicaciones web.',
  [Framework.ISO_27001]: 'Controles de seguridad de la información.',
  [Framework.OWASP_ASVS]: 'Estándar de verificación de seguridad de aplicaciones.',
  [Framework.NIST_SP_800_53]: 'Controles de seguridad y privacidad (NIST SP 800-53).',
  [Framework.DEVSECOPS]: 'Seguridad integrada en el ciclo de desarrollo.',
  [Framework.CUSTOM]: 'Políticas definidas por tu equipo.',
};

function ShieldBugIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <circle cx="12" cy="13" r="2.5" />
      <path d="M12 10.5V9" />
      <path d="M12 15.5V17" />
      <path d="M9.8 12H8" />
      <path d="M16 12h-1.8" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function GitIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M13 6h3a2 2 0 0 1 2 2v7" />
      <line x1="6" y1="9" x2="6" y2="21" />
    </svg>
  );
}

function CloudUploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectPolicySetId = searchParams.get('policySet');
  const [appliedPolicySetPreselect, setAppliedPolicySetPreselect] = useState(false);
  const [mode, setMode] = useState<SourceType>('ZIP');
  const [file, setFile] = useState<File | null>(null);
  const [gitUrl, setGitUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [accessToken, setAccessToken] = useState('');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null);
  const [selectedPolicySetId, setSelectedPolicySetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const policiesQuery = usePolicies();
  const policySetsQuery = usePolicySets('ACTIVE');
  const selectedPolicySet = policySetsQuery.data?.find((ps) => ps.id === selectedPolicySetId) ?? null;

  function pickFramework(framework: Framework | null) {
    setSelectedFramework(framework);
    setSelectedPolicySetId(null); // mutually exclusive: a Policy Set already fixes the composition
  }

  function pickPolicySet(id: string | null) {
    setSelectedPolicySetId(id);
    setSelectedFramework(null);
  }

  // "Aplicar a repositorio" from a Policy Set's detail page lands here with
  // ?policySet=<id> -- pick it as soon as the active-sets list is loaded, so
  // the user only has to add their code, not re-find the set they just came
  // from. Only kicks in once, and won't override a set the user picks manually.
  useEffect(() => {
    if (appliedPolicySetPreselect || !preselectPolicySetId) return;
    if (policySetsQuery.isLoading) return;
    const match = (policySetsQuery.data ?? []).find((ps) => ps.id === preselectPolicySetId);
    if (match) pickPolicySet(match.id);
    setAppliedPolicySetPreselect(true);
  }, [appliedPolicySetPreselect, preselectPolicySetId, policySetsQuery.isLoading, policySetsQuery.data]);

  const frameworkCounts = useMemo(() => {
    const counts = new Map<Framework, number>();
    for (const policy of policiesQuery.data?.content ?? []) {
      counts.set(policy.framework, (counts.get(policy.framework) ?? 0) + 1);
    }
    return counts;
  }, [policiesQuery.data]);

  const availableFrameworks = useMemo(
    () => Array.from(frameworkCounts.keys()).sort((a, b) => FRAMEWORK_LABELS[a].localeCompare(FRAMEWORK_LABELS[b])),
    [frameworkCounts],
  );

  function handleModeChange(next: SourceType) {
    setMode(next);
    setError('');
    setFile(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (mode !== 'ZIP') return;
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.zip')) {
      setFile(f);
      setError('');
    } else {
      setError('Solo se aceptan archivos .zip');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (mode === 'ZIP') {
      if (!file) { setError('Selecciona un archivo ZIP'); return; }
      if (file.size > 100 * 1024 * 1024) { setError('El archivo supera el límite de 100 MB'); return; }
    } else {
      if (!gitUrl.trim()) { setError('Ingresa la URL del repositorio Git'); return; }
    }

    setLoading(true);
    try {
      const resp = mode === 'ZIP'
        ? await uploadZip(file!)
        : await cloneGit({
            gitUrl: gitUrl.trim(),
            branch: branch.trim() || 'main',
            accessToken: accessToken.trim() || undefined,
          });
      const query = selectedPolicySetId
        ? `?policySet=${selectedPolicySetId}`
        : selectedFramework
          ? `?framework=${selectedFramework}`
          : '';
      navigate(`/repositories/${resp.id}/policy-selection${query}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Error al procesar el repositorio';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-3xl text-center pt-10 pb-8">
        <div className="w-16 h-16 bg-white border border-neutral-200 rounded-2xl shadow-sm flex items-center justify-center text-neutral-900 mx-auto mb-6">
          <ShieldBugIcon />
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-neutral-900 mb-3">
          Analiza tu proyecto
        </h1>
        <p className="text-neutral-500 text-base leading-relaxed max-w-lg mx-auto">
          Ejecuta un análisis estático profundo contra los estándares de la industria.
          Verifica el cumplimiento normativo con{' '}
          <code className="text-xs bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded font-mono">OWASP</code>
          {', '}
          <code className="text-xs bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded font-mono">ISO 27001</code>
          {' y '}
          <code className="text-xs bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded font-mono">DevSecOps</code>
          {' en segundos.'}
        </p>

        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            type="button"
            onClick={() => handleModeChange('ZIP')}
            className={mode === 'ZIP' ? 'btn-primary' : 'btn-outline'}
          >
            <UploadIcon />
            Subir archivo ZIP
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('GIT')}
            className={mode === 'GIT' ? 'btn-primary' : 'btn-outline'}
          >
            <GitIcon />
            URL de repositorio Git
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="w-full max-w-3xl space-y-4">
        {mode === 'ZIP' ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(''); }}
              className="hidden"
            />
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`card border-2 border-dashed rounded-xl p-16 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                dragging ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 bg-white hover:border-neutral-400'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${dragging ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                <CloudUploadIcon />
              </div>
              {file ? (
                <div>
                  <p className="font-semibold text-neutral-900 text-sm">{file.name}</p>
                  <p className="text-xs text-neutral-500 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB · listo para subir</p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-neutral-700 text-sm">Arrastra tu código fuente aquí</p>
                  <p className="text-xs text-neutral-400 mt-1 font-mono">Soporta .zip · Máx 100 MB</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="card p-6 space-y-4">
            <div>
              <label className="form-label block mb-1.5">URL del repositorio</label>
              <input
                type="url"
                value={gitUrl}
                onChange={(e) => setGitUrl(e.target.value)}
                placeholder="https://github.com/usuario/repo.git"
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label block mb-1.5">Rama</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="form-input max-w-xs"
              />
            </div>
            <div>
              <label className="form-label block mb-1.5">Token de acceso (opcional)</label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Solo para repositorios privados"
                autoComplete="off"
                className="form-input"
              />
              <p className="text-xs text-neutral-400 mt-1">
                Se usa una sola vez para clonar y no se almacena ni se muestra en ningún lado.
              </p>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {selectedPolicySet && (
          <p className="text-xs text-neutral-500 text-center">
            Policy Set preseleccionado: <span className="font-semibold text-neutral-900">{selectedPolicySet.name}</span> ({selectedPolicySet.policyIds.length} política{selectedPolicySet.policyIds.length === 1 ? '' : 's'}) — ya vendrán marcadas en el siguiente paso.
          </p>
        )}
        {selectedFramework && !selectedPolicySet && (
          <p className="text-xs text-neutral-500 text-center">
            Framework preseleccionado: <span className="font-semibold text-neutral-900">{FRAMEWORK_LABELS[selectedFramework]}</span> — sus políticas ya vendrán marcadas en el siguiente paso.
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
          {loading
            ? (mode === 'ZIP' ? 'Subiendo...' : 'Clonando...')
            : (mode === 'ZIP' ? 'Subir y continuar a selección de políticas' : 'Clonar y continuar a selección de políticas')}
        </button>
      </form>

      {(policySetsQuery.data?.length ?? 0) > 0 && (
        <div className="w-full max-w-3xl mt-10 bg-neutral-50 border border-neutral-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">
              Policy Sets · tus conjuntos personalizados
            </p>
            {selectedPolicySetId && (
              <button
                type="button"
                onClick={() => pickPolicySet(null)}
                className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                Quitar selección ✕
              </button>
            )}
          </div>
          <p className="text-xs text-neutral-400 mb-4">
            Un conjunto que armaste a mano combinando políticas — puede mezclar varios frameworks a la vez.
            No es lo mismo que elegir un framework abajo.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {policySetsQuery.data!.map((ps) => {
              const isSelected = selectedPolicySetId === ps.id;
              return (
                <button
                  key={ps.id}
                  type="button"
                  onClick={() => pickPolicySet(isSelected ? null : ps.id)}
                  aria-pressed={isSelected}
                  className={`card p-4 text-left transition-all bg-white ${
                    isSelected ? 'border-neutral-900 ring-1 ring-neutral-900' : 'hover:border-neutral-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-neutral-900">{ps.name}</p>
                    <span className={`badge text-xs shrink-0 ${isSelected ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'}`}>
                      {ps.policyIds.length}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    {ps.description || 'Sin descripción.'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(policySetsQuery.data?.length ?? 0) > 0 && (
        <hr className="w-full max-w-3xl mt-10 border-neutral-200" />
      )}

      <div className="w-full max-w-3xl mt-10 mb-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
            Frameworks soportados · agrupar por norma
          </p>
          {selectedFramework && (
            <button
              type="button"
              onClick={() => pickFramework(null)}
              className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              Quitar selección ✕
            </button>
          )}
        </div>
        <p className="text-xs text-neutral-400 mb-4 -mt-2">
          Elige un framework para preseleccionar sus políticas al continuar.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {availableFrameworks.map((framework) => {
            const isSelected = selectedFramework === framework;
            return (
              <button
                key={framework}
                type="button"
                onClick={() => pickFramework(isSelected ? null : framework)}
                aria-pressed={isSelected}
                className={`card p-4 text-left transition-all ${
                  isSelected ? 'border-neutral-900 ring-1 ring-neutral-900' : 'hover:border-neutral-400'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-neutral-900">{FRAMEWORK_LABELS[framework]}</p>
                  <span className={`badge text-xs shrink-0 ${isSelected ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'}`}>
                    {frameworkCounts.get(framework) ?? 0}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed">{FRAMEWORK_DESCRIPTIONS[framework]}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
