// Why a session was ended by the server, kept across the redirect to /login so the login page
// can say it. sessionStorage can be unavailable (private mode, blocked storage): then the user
// just lands on the login page without the explanation.

const KEY = 'segsoft.sessionEndedNotice';

interface ApiError {
  config?: { url?: string; headers?: Record<string, unknown> };
  response?: { status?: number; data?: { errorCode?: string; message?: string } };
}

/**
 * The message to show when a request made with a session was refused because the account was
 * locked, disabled or deleted after the session started; null for any other error. The public
 * auth endpoints (login, unlock...) report those states themselves, in their own page.
 */
export function sessionEndedMessage(error: unknown): string | null {
  const { config, response } = (error ?? {}) as ApiError;
  const url = config?.url ?? '';
  const withSession = Boolean(config?.headers?.Authorization);
  const publicAuthEndpoint = url.includes('/api/v1/auth/') && !url.endsWith('/api/v1/auth/me');
  if (!withSession || publicAuthEndpoint) return null;

  const code = response?.data?.errorCode;
  const ended =
    (response?.status === 423 && code === 'ACCOUNT_LOCKED') ||
    (response?.status === 401 && code === 'SESSION_REVOKED');
  return ended ? response?.data?.message ?? 'Tu sesión terminó. Inicia sesión de nuevo.' : null;
}

export function saveSessionEndedNotice(message: string): void {
  try {
    sessionStorage.setItem(KEY, message);
  } catch {
    // Storage unavailable: the notice is lost, the redirect still happens.
  }
}

export function readSessionEndedNotice(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearSessionEndedNotice(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
