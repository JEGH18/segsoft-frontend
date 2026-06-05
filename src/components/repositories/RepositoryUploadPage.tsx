import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadZip, cloneGit } from '@/api/repositories';
import type { RepositoryResponse, SourceType } from '@/types/repository';

const STATUS_LABELS: Record<string, string> = {
  UPLOADING: 'Subiendo...',
  READY_FOR_ANALYSIS: 'Listo para analizar',
  ANALYZING: 'En análisis',
  ARCHIVED: 'Archivado',
  EXPIRED: 'Expirado',
  FAILED: 'Error',
};

const STATUS_BADGE: Record<string, string> = {
  UPLOADING: 'bg-neutral-100 text-neutral-600',
  READY_FOR_ANALYSIS: 'bg-neutral-900 text-white',
  ANALYZING: 'bg-neutral-700 text-white',
  ARCHIVED: 'bg-neutral-200 text-neutral-600',
  EXPIRED: 'bg-neutral-100 text-neutral-400',
  FAILED: 'bg-red-50 text-red-600',
};

export default function RepositoryUploadPage() {
  const navigate = useNavigate();
  const [sourceType, setSourceType] = useState<SourceType>('ZIP');
  const [file, setFile] = useState<File | null>(null);
  const [gitUrl, setGitUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RepositoryResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError('');
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
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
    setResult(null);

    if (sourceType === 'ZIP') {
      if (!file) { setError('Selecciona un archivo ZIP'); return; }
      const MAX_MB = 100;
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`El archivo supera el límite de ${MAX_MB} MB`);
        return;
      }
    } else {
      if (!gitUrl.trim()) { setError('Ingresa la URL del repositorio Git'); return; }
    }

    setLoading(true);
    try {
      const resp = sourceType === 'ZIP'
        ? await uploadZip(file!)
        : await cloneGit({ gitUrl: gitUrl.trim(), branch: branch.trim() || 'main' });
      setResult(resp);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Error al procesar el repositorio';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFile(null);
    setGitUrl('');
    setBranch('main');
    setError('');
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header">
        <h2 className="page-title">Cargar repositorio</h2>
        <p className="page-subtitle">Sube un ZIP o proporciona una URL Git pública para iniciar el análisis.</p>
      </div>

      {result ? (
        <ResultCard result={result} onNew={reset} onSelectPolicies={(id) => navigate(`/repositories/${id}/policy-selection`)} />
      ) : (
        <form onSubmit={handleSubmit} noValidate className="card p-6 space-y-5">
          {/* Source type toggle */}
          <div className="flex gap-2">
            {(['ZIP', 'GIT'] as SourceType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setSourceType(t); setError(''); }}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border-2 transition-colors ${
                  sourceType === t
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'
                }`}
              >
                {t === 'ZIP' ? 'Archivo ZIP' : 'URL Git'}
              </button>
            ))}
          </div>

          {sourceType === 'ZIP' ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                dragging
                  ? 'border-neutral-900 bg-neutral-50'
                  : 'border-neutral-200 bg-neutral-50 hover:border-neutral-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,application/zip"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div>
                  <p className="font-semibold text-neutral-900 text-sm">{file.name}</p>
                  <p className="text-xs text-neutral-500 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-neutral-600">Arrastra tu ZIP aquí o haz clic para seleccionar</p>
                  <p className="text-xs text-neutral-400 mt-1 font-mono">Máximo 100 MB · 5 000 archivos</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="form-label block mb-1.5">URL del repositorio</label>
                <input
                  type="url"
                  value={gitUrl}
                  onChange={(e) => setGitUrl(e.target.value)}
                  placeholder="https://github.com/usuario/repo.git"
                  required
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
            <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
            {loading
              ? (sourceType === 'ZIP' ? 'Subiendo...' : 'Clonando...')
              : (sourceType === 'ZIP' ? 'Subir repositorio' : 'Clonar repositorio')}
          </button>
        </form>
      )}
    </div>
  );
}

function ResultCard({ result, onNew, onSelectPolicies }: { result: RepositoryResponse; onNew: () => void; onSelectPolicies: (id: string) => void }) {
  const badgeClass = STATUS_BADGE[result.status] ?? 'bg-neutral-100 text-neutral-600';

  return (
    <div className={`card p-6 ${result.status === 'FAILED' ? 'border-red-200' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="font-semibold text-neutral-900">{result.originalName}</p>
          <span className={`badge mt-1 ${badgeClass}`}>
            {STATUS_LABELS[result.status] ?? result.status}
          </span>
        </div>
        <button onClick={onNew} className="btn-outline text-xs px-3 py-1.5">
          Nuevo
        </button>
      </div>

      <table className="w-full text-sm">
        <tbody className="divide-y divide-neutral-100">
          <tr>
            <td className="py-2 pr-4 w-24 font-medium text-neutral-500 text-xs">ID</td>
            <td className="py-2 font-mono text-xs text-neutral-700 break-all">{result.id}</td>
          </tr>
          <tr>
            <td className="py-2 pr-4 font-medium text-neutral-500 text-xs">Tipo</td>
            <td className="py-2 text-neutral-700">{result.sourceType}</td>
          </tr>
          {result.gitUrl && (
            <tr>
              <td className="py-2 pr-4 font-medium text-neutral-500 text-xs">URL</td>
              <td className="py-2 text-neutral-700 break-all">{result.gitUrl} ({result.branch})</td>
            </tr>
          )}
          {result.fileCount != null && (
            <tr>
              <td className="py-2 pr-4 font-medium text-neutral-500 text-xs">Archivos</td>
              <td className="py-2 text-neutral-700">{result.fileCount}</td>
            </tr>
          )}
          <tr>
            <td className="py-2 pr-4 font-medium text-neutral-500 text-xs">Expira</td>
            <td className="py-2 text-neutral-700">{new Date(result.expiresAt).toLocaleString()}</td>
          </tr>
          {result.errorMessage && (
            <tr>
              <td className="py-2 pr-4 font-medium text-neutral-500 text-xs">Error</td>
              <td className="py-2 text-red-600">{result.errorMessage}</td>
            </tr>
          )}
        </tbody>
      </table>

      {result.status === 'READY_FOR_ANALYSIS' && (
        <div className="mt-4 border-t border-neutral-100 pt-4 flex items-center justify-between">
          <p className="text-sm text-neutral-700">El repositorio está listo para análisis.</p>
          <button
            type="button"
            onClick={() => onSelectPolicies(result.id)}
            className="btn-primary text-xs px-4 py-2"
          >
            Seleccionar políticas →
          </button>
        </div>
      )}
    </div>
  );
}
