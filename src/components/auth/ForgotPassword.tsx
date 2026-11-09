import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '@/api/auth';
import { AlertIcon, MailIcon, ShieldIcon } from '@/components/auth/AuthIcons';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface ApiError {
  response?: { data?: { message?: string } };
}

/**
 * Asks for the link to choose a new password (/forgot-password). The answer is the same whether or
 * not the email has an account, so this page cannot be used to find out which emails are registered.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trimmed = email.trim().toLowerCase();
  const valid = EMAIL_PATTERN.test(trimmed);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid) {
      setError('Escribe un correo válido.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      setSent(await forgotPassword(trimmed));
    } catch (err: unknown) {
      const { response } = err as ApiError;
      setError(response?.data?.message ?? 'No se pudo enviar el correo. Intenta nuevamente.');
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
          <h1 className="text-2xl font-bold text-neutral-900 mb-1">
            {sent ? 'Revisa tu correo' : 'Recuperar contraseña'}
          </h1>

          {sent ? (
            <div role="status" className="mt-4 text-sm text-neutral-600 space-y-3">
              <p>{sent}</p>
              <p>Si no lo ves en unos minutos, revisa la carpeta de spam o vuelve a pedirlo.</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate aria-label="Recuperar contraseña" className="mt-4 space-y-5">
              <p className="text-sm text-neutral-500">
                Escribe el correo verificado de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva.
              </p>
              <div>
                <label htmlFor="email" className="form-label block mb-1.5">
                  Correo
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <MailIcon />
                  </span>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="nombre@correo.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="form-input form-input-icon"
                  />
                </div>
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
                {sending ? 'Enviando...' : 'Enviar enlace'}
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
