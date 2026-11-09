import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword } from '@/api/auth';
import { AlertIcon, LockIcon, ShieldIcon } from '@/components/auth/AuthIcons';
import { PasswordRulesList } from '@/components/auth/PasswordRules';
import PasswordToggle from '@/components/auth/PasswordToggle';
import { meetsPasswordRules } from '@/utils/passwordRules';

interface ApiError {
  response?: {
    data?: { errorCode?: string; message?: string; errors?: Partial<Record<'password', string>> };
  };
}

/**
 * Target of the password reset email (/reset-password?token=...). The token is sent only with the
 * new password, so a mail scanner that opens the link cannot use it. Changing the password ends
 * every open session; it does not log in.
 */
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  // The link itself is not valid (missing, used or expired): only a new one helps.
  const [linkError, setLinkError] = useState<string | null>(
    token ? null : 'El enlace no tiene un token. Ábrelo desde el correo o pide uno nuevo.',
  );
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const weak = !meetsPasswordRules(password);
    const mismatch = password !== confirm;
    setPasswordError(weak ? 'La contraseña no cumple todos los requisitos' : null);
    setConfirmError(!confirm ? 'Confirma la contraseña' : mismatch ? 'Las contraseñas no coinciden' : null);
    if (weak || mismatch || !confirm) return;

    setSending(true);
    try {
      setDone(await resetPassword(token, password));
    } catch (err: unknown) {
      const data = (err as ApiError).response?.data;
      if (data?.errorCode === 'INVALID_RESET_TOKEN') {
        setLinkError(data.message ?? 'El enlace no es válido, ya se usó o venció. Pide uno nuevo.');
      } else if (data?.errors?.password || data?.errorCode === 'VALIDATION_ERROR') {
        // Too common, or the same as the current one: the link still works with another password.
        setPasswordError(data.errors?.password ?? data.message ?? 'La contraseña no es válida');
      } else {
        setError(data?.message ?? 'No se pudo cambiar la contraseña. Intenta nuevamente.');
      }
    } finally {
      setSending(false);
    }
  }

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
          <h1 className="text-2xl font-bold text-neutral-900 mb-1">Nueva contraseña</h1>

          {done ? (
            <>
              <div
                role="status"
                className="mt-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg px-4 py-3"
              >
                {done}
              </div>
              <Link to="/login" className="btn-primary w-full justify-center mt-6">
                Iniciar sesión
              </Link>
            </>
          ) : linkError ? (
            <div className="mt-4 space-y-5">
              <div
                role="alert"
                className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3"
              >
                <span className="shrink-0 mt-0.5"><AlertIcon /></span>
                <span>{linkError}</span>
              </div>
              <Link to="/forgot-password" className="btn-primary w-full justify-center">
                Pedir un enlace nuevo
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate aria-label="Elegir una contraseña nueva" className="mt-4 space-y-5">
              <p className="text-sm text-neutral-500">
                Al cambiarla se cierran todas las sesiones abiertas de tu cuenta.
              </p>
              <div>
                <label htmlFor="password" className="form-label block mb-1.5">
                  Contraseña nueva
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <LockIcon />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    aria-invalid={!!passwordError}
                    aria-describedby={`password-rules${passwordError ? ' password-error' : ''}`}
                    className="form-input form-input-icon pr-10"
                  />
                  <PasswordToggle
                    controls="password"
                    visible={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                    label="contraseña"
                  />
                </div>
                {passwordError && (
                  <p id="password-error" role="alert" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <span>•</span> {passwordError}
                  </p>
                )}
                <PasswordRulesList password={password} />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="form-label block mb-1.5">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <LockIcon />
                  </span>
                  <input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="••••••••••••"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    aria-invalid={!!confirmError}
                    aria-describedby={confirmError ? 'confirm-error' : undefined}
                    className="form-input form-input-icon pr-10"
                  />
                  <PasswordToggle
                    controls="confirmPassword"
                    visible={showConfirm}
                    onToggle={() => setShowConfirm((v) => !v)}
                    label="confirmación de contraseña"
                  />
                </div>
                {confirmError && (
                  <p id="confirm-error" role="alert" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <span>•</span> {confirmError}
                  </p>
                )}
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3"
                >
                  <span className="shrink-0 mt-0.5"><AlertIcon /></span>
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={sending} className="btn-primary w-full justify-center">
                {sending ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
            </form>
          )}

          <p className="text-sm text-neutral-500 text-center mt-6">
            <Link to="/login" className="font-medium text-neutral-900 hover:underline">
              Volver a iniciar sesión
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-neutral-400 mt-6">
          PDG SegSoft &mdash; Universidad Icesi
        </p>
      </div>
    </div>
  );
}
