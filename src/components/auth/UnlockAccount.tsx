import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { unlockAccount } from '@/api/auth';
import { AlertIcon, ShieldIcon } from '@/components/auth/AuthIcons';

interface ApiError {
  response?: { data?: { message?: string } };
}

/**
 * Target of the link emailed when an account is locked by failed logins (/unlock-account?token=...).
 * The token is sent with a POST from here, so mail scanners that open the link with a GET do not
 * use it up. Unlocking does not log in: the user goes on to the login with the password.
 */
export default function UnlockAccount() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    token ? null : 'El enlace no tiene un token de desbloqueo. Ábrelo desde el correo que te enviamos.',
  );
  // The token is single-use: React StrictMode runs effects twice in development.
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    unlockAccount(token)
      .then(setMessage)
      .catch((err: unknown) => {
        const { response } = err as ApiError;
        setError(response?.data?.message ?? 'No se pudo desbloquear la cuenta. Intenta nuevamente.');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-white border border-neutral-200 rounded-2xl shadow-sm flex items-center justify-center text-neutral-900 mb-4">
            <ShieldIcon />
          </div>
          <span className="text-xl font-bold tracking-tight text-neutral-900">SegSoft</span>
          <p className="text-sm text-neutral-500 mt-1">Plataforma de análisis de seguridad estático</p>
        </div>

        <div className="card p-8">
          <h1 className="text-2xl font-bold text-neutral-900 mb-1">Desbloquear cuenta</h1>

          {error ? (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3"
            >
              <span className="shrink-0 mt-0.5"><AlertIcon /></span>
              <span>{error}</span>
            </div>
          ) : message ? (
            <div
              role="status"
              className="mt-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg px-4 py-3"
            >
              {message}
            </div>
          ) : (
            <p role="status" className="mt-4 text-sm text-neutral-600">
              Desbloqueando tu cuenta...
            </p>
          )}

          <Link to="/login" className="btn-primary w-full justify-center mt-6">
            Ir a iniciar sesión
          </Link>
        </div>

        <p className="text-center text-xs text-neutral-400 mt-6">
          PDG SegSoft &mdash; Universidad Icesi
        </p>
      </div>
    </div>
  );
}
