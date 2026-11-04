import { useEffect, useState } from 'react';
import { resendVerification } from '@/api/auth';

// Same as the backend (EmailVerificationService.RESEND_COOLDOWN): an earlier request sends nothing.
export const RESEND_COOLDOWN_SECONDS = 60;

interface ApiError {
  response?: { data?: { message?: string } };
}

interface Props {
  email: string;
  /** Seconds to wait before the first resend, e.g. right after the registration sent the link. */
  initialCooldown?: number;
  disabled?: boolean;
}

export default function ResendVerificationButton({ email, initialCooldown = 0, disabled = false }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(initialCooldown);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const onClick = async () => {
    setSending(true);
    setError(null);
    setSent(false);
    try {
      await resendVerification(email);
      setSent(true);
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    } catch (err: unknown) {
      const { response } = err as ApiError;
      setError(response?.data?.message ?? 'No se pudo reenviar el correo. Intenta nuevamente.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || sending || secondsLeft > 0}
        className="btn-outline w-full justify-center"
      >
        {sending
          ? 'Enviando...'
          : secondsLeft > 0
            ? `Reenviar correo (${secondsLeft} s)`
            : 'Reenviar correo'}
      </button>
      {sent && (
        <p role="status" className="text-xs text-green-700 text-center">
          Te enviamos un enlace nuevo. Revisa también la carpeta de spam.
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-600 text-center">
          {error}
        </p>
      )}
    </div>
  );
}
