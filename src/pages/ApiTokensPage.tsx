import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createApiToken, listApiTokens, revokeApiToken } from '@/api/apiTokens';
import { useAuth } from '@/store/authStore';
import Spinner from '@/components/reports/Spinner';
import { formatDateTime } from '@/pages/reports/reportFormat';
import type { ApiToken, CreateApiTokenRequest, CreatedApiToken } from '@/types/apiToken';

const DURATIONS = [
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
  { days: 180, label: '180 días' },
  { days: 365, label: '1 año' },
];

function serverMessage(error: unknown, fallback: string): string {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

function NewTokenNotice({ created, onClose }: { created: CreatedApiToken; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(created.token);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div role="status" className="card p-5 border-green-300 bg-green-50 space-y-3">
      <div>
        <p className="text-sm font-semibold text-neutral-900">Token «{created.name}» creado</p>
        <p className="text-sm text-neutral-700 mt-1">
          Cópialo ahora y guárdalo como secreto en tu pipeline: <strong>no se volverá a mostrar</strong>. Vence el{' '}
          {formatDateTime(created.expiresAt)}.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <code
          aria-label="Valor del token"
          className="flex-1 min-w-0 break-all font-mono text-xs bg-white border border-neutral-200 rounded-lg px-3 py-2"
        >
          {created.token}
        </code>
        <button type="button" onClick={copy} className="btn-outline shrink-0">
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <p className="text-xs text-neutral-600">
        Úsalo como variable de entorno <code className="font-mono">PDGSEG_API_TOKEN</code> para el CLI, o en el
        encabezado <code className="font-mono">Authorization: Bearer &lt;token&gt;</code>.
      </p>
      <button type="button" onClick={onClose} className="btn-ghost -ml-3">
        Ya lo guardé
      </button>
    </div>
  );
}

function TokenRow({ token, showOwner, onRevoke, revoking }: {
  token: ApiToken;
  showOwner: boolean;
  onRevoke: (id: string) => void;
  revoking: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <tr className="border-t border-neutral-100">
      <td className="table-td font-medium text-neutral-900">{token.name}</td>
      <td className="table-td font-mono text-xs text-neutral-600">{token.tokenPrefix ? `${token.tokenPrefix}…` : '—'}</td>
      {showOwner && <td className="table-td">{token.ownerUsername}</td>}
      <td className="table-td">{formatDateTime(token.createdAt)}</td>
      <td className="table-td">
        {token.expired ? (
          <span className="badge bg-red-50 text-red-700">Vencido</span>
        ) : (
          formatDateTime(token.expiresAt)
        )}
      </td>
      <td className="table-td">{token.lastUsedAt ? formatDateTime(token.lastUsedAt) : 'Nunca'}</td>
      <td className="table-td text-right whitespace-nowrap">
        {confirming ? (
          <span className="inline-flex items-center gap-2">
            <span className="text-xs text-neutral-600">¿Revocar?</span>
            <button
              type="button"
              disabled={revoking}
              onClick={() => onRevoke(token.id)}
              className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              Sí, revocar
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="text-sm text-neutral-500 hover:text-neutral-900">
              Cancelar
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Revocar ${token.name}`}
            className="text-sm font-medium text-red-600 hover:text-red-800"
          >
            Revocar
          </button>
        )}
      </td>
    </tr>
  );
}

export default function ApiTokensPage() {
  const { user } = useAuth();
  const isAdmin = !!user?.roles.includes('SECURITY_ADMIN');
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [days, setDays] = useState(90);
  const [created, setCreated] = useState<CreatedApiToken | null>(null);

  const tokens = useQuery({ queryKey: ['api-tokens'], queryFn: listApiTokens, retry: false });

  const create = useMutation({
    mutationFn: (request: CreateApiTokenRequest) => createApiToken(request),
    onSuccess: (token) => {
      setCreated(token);
      setName('');
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
    },
  });

  const revoke = useMutation({
    mutationFn: (id: string) => revokeApiToken(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-tokens'] }),
  });

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreated(null);
    create.mutate({ name: name.trim(), expiresInDays: days });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="page-header">
        <h1 className="page-title">Tokens de API</h1>
        <p className="page-subtitle">
          Para ejecutar análisis desde pipelines CI/CD con el CLI <code className="font-mono">pdgseg</code>. Cada token
          actúa con tu usuario y tus permisos; revócalo si deja de usarse o se filtra.
        </p>
      </div>

      <form onSubmit={handleCreate} noValidate className="card p-5 space-y-4" aria-label="Crear token de API">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] items-end">
          <div>
            <label htmlFor="token-name" className="form-label block mb-1.5">Nombre</label>
            <input
              id="token-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={150}
              placeholder="Por ejemplo: GitHub Actions de segsoft-backend"
              className="form-input"
            />
          </div>
          <div>
            <label htmlFor="token-duration" className="form-label block mb-1.5">Duración</label>
            <select
              id="token-duration"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="form-select"
            >
              {DURATIONS.map((d) => (
                <option key={d.days} value={d.days}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>
        {create.isError && (
          <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {serverMessage(create.error, 'No se pudo crear el token.')}
          </p>
        )}
        <button type="submit" disabled={!name.trim() || create.isPending} className="btn-primary">
          {create.isPending ? 'Creando…' : 'Crear token'}
        </button>
      </form>

      {created && <NewTokenNotice created={created} onClose={() => setCreated(null)} />}

      <section aria-label={isAdmin ? 'Tokens de todos los usuarios' : 'Tus tokens'} className="space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">
          {isAdmin ? 'Tokens de todos los usuarios' : 'Tus tokens'}
        </h2>

        {tokens.isLoading && (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Spinner /> Cargando tokens...
          </div>
        )}
        {tokens.isError && (
          <div role="alert" className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            No se pudieron cargar los tokens.
          </div>
        )}
        {revoke.isError && (
          <div role="alert" className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            {serverMessage(revoke.error, 'No se pudo revocar el token.')}
          </div>
        )}

        {tokens.data && tokens.data.length === 0 && (
          <div className="card p-8 text-center text-sm text-neutral-500">Aún no tienes tokens de API.</div>
        )}

        {tokens.data && tokens.data.length > 0 && (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="table-th">Nombre</th>
                  <th className="table-th">Token</th>
                  {isAdmin && <th className="table-th">Dueño</th>}
                  <th className="table-th">Creado</th>
                  <th className="table-th">Vence</th>
                  <th className="table-th">Último uso</th>
                  <th className="table-th"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {tokens.data.map((t) => (
                  <TokenRow
                    key={t.id}
                    token={t}
                    showOwner={isAdmin}
                    onRevoke={(id) => revoke.mutate(id)}
                    revoking={revoke.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
