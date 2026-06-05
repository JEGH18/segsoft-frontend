import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadZip, cloneGit } from '@/api/repositories';
import type { SourceType } from '@/types/repository';

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
  const [mode, setMode] = useState<SourceType>('ZIP');
  const [file, setFile] = useState<File | null>(null);
  const [gitUrl, setGitUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        : await cloneGit({ gitUrl: gitUrl.trim(), branch: branch.trim() || 'main' });
      navigate(`/repositories/${resp.id}/policy-selection`);
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
          <code className="text-xs bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded font-mono">ISO 27002</code>
          {' y '}
          <code className="text-xs bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded font-mono">NIST SSDF</code>
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
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
          {loading
            ? (mode === 'ZIP' ? 'Subiendo...' : 'Clonando...')
            : (mode === 'ZIP' ? 'Subir y continuar a selección de políticas' : 'Clonar y continuar a selección de políticas')}
        </button>
      </form>

      <div className="w-full max-w-3xl mt-10 mb-8">
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-4">
          Frameworks soportados
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { name: 'OWASP Top 10', description: 'Vulnerabilidades más críticas en aplicaciones web.' },
            { name: 'ISO 27002', description: 'Controles de seguridad de la información.' },
            { name: 'NIST SSDF', description: 'Secure Software Development Framework.' },
            { name: 'Personalizado', description: 'Políticas definidas por tu equipo.' },
          ].map((profile) => (
            <div key={profile.name} className="card p-4">
              <p className="text-sm font-semibold text-neutral-900 mb-1">{profile.name}</p>
              <p className="text-xs text-neutral-500 leading-relaxed">{profile.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
