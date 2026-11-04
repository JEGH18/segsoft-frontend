import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { me, verifyEmail } from '@/api/auth';
import { useAuth } from '@/store/authStore';
import { setAccessToken } from '@/utils/tokenStorage';
import { AlertIcon, MailIcon, ShieldIcon } from '@/components/auth/AuthIcons';
import ResendVerificationButton from '@/components/auth/ResendVerificationButton';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface ApiError {
  response?: { data?: { message?: string } };
}

/**
 * Target of the emailed link (/verify-email?token=...). The token is sent only when the user
 * presses the button: some mail scanners open the links and run the page's JavaScript, and
 * verifying starts a session, which must go to the user and not to the scanner.
 */
export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(
    token ? null : 'El enlace no tiene un token de verificación. Ábrelo desde el correo o pide uno nuevo.',
  );
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  async function verify() {
    setSending(true);
    try {
      const authResponse = await verifyEmail(token);
      setAccessToken(authResponse.accessToken);
      const userResponse = await me();
      login(userResponse, authResponse.accessToken);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const { response } = err as ApiError;
      setError(response?.data?.message ?? 'No se pudo verificar el correo. Intenta nuevamente.');
      setSending(false);
    }
  }

  const trimmedEmail = email.trim().toLowerCase();

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
          <h1 className="text-2xl font-bold text-neutral-900 mb-1">Verificación de correo</h1>

          {!error ? (
            <>
              <p className="mt-4 text-sm text-neutral-600">
                Confirma que este correo es tuyo para activar tu cuenta.
              </p>
              <button
                type="button"
                onClick={() => void verify()}
                disabled={sending}
                className="btn-primary w-full justify-center mt-6"
              >
                {sending ? 'Verificando...' : 'Verificar mi correo'}
              </button>
            </>
          ) : (
            <div className="mt-4 space-y-5">
              <div
                role="alert"
                className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3"
              >
                <span className="shrink-0 mt-0.5"><AlertIcon /></span>
                <span>{error}</span>
              </div>

              <div>
                <label htmlFor="resend-email" className="form-label block mb-1.5">
                  ¿Necesitas un enlace nuevo? Escribe tu correo
                </label>
                <div className="relative mb-3">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <MailIcon />
                  </span>
                  <input
                    id="resend-email"
                    type="email"
                    autoComplete="email"
                    placeholder="nombre@correo.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="form-input form-input-icon"
                  />
                </div>
                <ResendVerificationButton email={trimmedEmail} disabled={!EMAIL_PATTERN.test(trimmedEmail)} />
              </div>
            </div>
          )}

          <p className="text-sm text-neutral-500 text-center mt-6">
            <Link to="/login" className="font-medium text-neutral-900 hover:underline">
              Ir a iniciar sesión
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
