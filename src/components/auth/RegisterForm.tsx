import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { me, register as apiRegister, registrationStatus } from '@/api/auth';
import { useAuth } from '@/store/authStore';
import { setAccessToken } from '@/utils/tokenStorage';
import { AlertIcon, ArrowIcon, LockIcon, ShieldIcon, UserIcon } from '@/components/auth/AuthIcons';

// Same rules as the backend (RegisterRequest and PasswordPolicyValidator). The backend also
// rejects common passwords, reserved names and taken names; those errors come back from the API.
const USERNAME_PATTERN = /^[a-z][a-z0-9._-]{2,49}$/;

const PASSWORD_RULES = [
  { id: 'length', label: 'Al menos 12 caracteres', test: (p: string) => p.length >= 12 },
  { id: 'upper', label: 'Una letra mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'Una letra minúscula', test: (p: string) => /[a-z]/.test(p) },
  { id: 'digit', label: 'Un número', test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: 'Un carácter especial (por ejemplo ! - _ @)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const schema = z
  .object({
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'El usuario es requerido')
      .regex(
        USERNAME_PATTERN,
        'Entre 3 y 50 caracteres: empieza con una letra y usa solo letras, números, ".", "_" o "-"',
      ),
    password: z
      .string()
      .min(1, 'La contraseña es requerida')
      .refine((p) => PASSWORD_RULES.every((rule) => rule.test(p)), 'La contraseña no cumple todos los requisitos'),
    confirmPassword: z.string().min(1, 'Confirma la contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  });

type FormData = z.infer<typeof schema>;

interface ApiError {
  response?: {
    status?: number;
    data?: {
      errorCode?: string;
      message?: string;
      errors?: Partial<Record<'username' | 'password', string>>;
    };
  };
}

function fieldClass(hasError: boolean) {
  return `form-input form-input-icon ${hasError ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}`;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
      <span>•</span> {message}
    </p>
  );
}

export default function RegisterForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    let active = true;
    registrationStatus()
      .then((status) => {
        if (active) setEnabled(status.enabled);
      })
      // If the status cannot be read, show the form: the backend still decides.
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const password = watch('password') ?? '';

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      const authResponse = await apiRegister({ username: data.username, password: data.password });
      setAccessToken(authResponse.accessToken);
      const userResponse = await me();
      login(userResponse, authResponse.accessToken);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const { response } = err as ApiError;
      const fieldErrors = response?.data?.errors;
      if (fieldErrors?.username || fieldErrors?.password) {
        if (fieldErrors.username) setError('username', { message: fieldErrors.username });
        if (fieldErrors.password) setError('password', { message: fieldErrors.password });
        return;
      }
      const message = response?.data?.message;
      // Taken (409) or reserved (400 VALIDATION_ERROR) names belong next to the username field.
      const usernameRejected =
        response?.status === 409 ||
        (response?.status === 400 && response.data?.errorCode === 'VALIDATION_ERROR');
      if (message && usernameRejected) {
        setError('username', { message });
        return;
      }
      if (response?.status === 403) setEnabled(false);
      setServerError(message ?? 'No se pudo crear la cuenta. Intenta nuevamente.');
    }
  };

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
          <h1 className="text-2xl font-bold text-neutral-900 mb-1">Crear cuenta</h1>

          {!enabled ? (
            <div role="status" className="mt-4 text-sm text-neutral-600 space-y-4">
              <p>El registro de nuevas cuentas está deshabilitado. Pide una cuenta al administrador de SegSoft.</p>
              {serverError && <p className="text-red-700">{serverError}</p>}
            </div>
          ) : (
            <>
              <p className="text-sm text-neutral-500 mb-8">
                Tu cuenta tendrá el rol <span className="font-medium text-neutral-700">Developer</span>: podrás
                subir proyectos, analizarlos y revisar sus hallazgos.
              </p>

              <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                aria-label="Formulario de registro"
                className="space-y-5"
              >
                <div>
                  <label htmlFor="username" className="form-label block mb-1.5">
                    Usuario
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <UserIcon />
                    </span>
                    <input
                      id="username"
                      type="text"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="nombre.usuario"
                      aria-invalid={!!errors.username}
                      aria-describedby={errors.username ? 'username-error' : 'username-hint'}
                      className={fieldClass(!!errors.username)}
                      {...register('username', {
                        // Show the name as it will be stored, keeping the caret in place.
                        onChange: (event: ChangeEvent<HTMLInputElement>) => {
                          const input = event.target;
                          const lower = input.value.toLowerCase();
                          if (lower !== input.value) {
                            const { selectionStart, selectionEnd } = input;
                            input.value = lower;
                            input.setSelectionRange(selectionStart, selectionEnd);
                          }
                        },
                      })}
                    />
                  </div>
                  {errors.username ? (
                    <FieldError id="username-error" message={errors.username.message} />
                  ) : (
                    <p id="username-hint" className="mt-1.5 text-xs text-neutral-500">
                      Se guarda en minúsculas. Lo usarás para iniciar sesión.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="form-label block mb-1.5">
                    Contraseña
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <LockIcon />
                    </span>
                    <input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••••••"
                      aria-invalid={!!errors.password}
                      aria-describedby={`password-rules${errors.password ? ' password-error' : ''}`}
                      className={fieldClass(!!errors.password)}
                      {...register('password')}
                    />
                  </div>
                  <FieldError id="password-error" message={errors.password?.message} />
                  <ul id="password-rules" aria-label="Requisitos de la contraseña" className="mt-2 space-y-1">
                    {PASSWORD_RULES.map((rule) => {
                      const ok = rule.test(password);
                      return (
                        <li
                          key={rule.id}
                          data-ok={ok}
                          className={`text-xs flex items-center gap-1.5 ${ok ? 'text-green-700' : 'text-neutral-500'}`}
                        >
                          <span aria-hidden="true">{ok ? '✓' : '○'}</span>
                          {rule.label}
                          <span className="sr-only">{ok ? '(cumplido)' : '(pendiente)'}</span>
                        </li>
                      );
                    })}
                  </ul>
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
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••••••"
                      aria-invalid={!!errors.confirmPassword}
                      aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined}
                      className={fieldClass(!!errors.confirmPassword)}
                      {...register('confirmPassword')}
                    />
                  </div>
                  <FieldError id="confirm-error" message={errors.confirmPassword?.message} />
                </div>

                {serverError && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3"
                  >
                    <span className="shrink-0 mt-0.5"><AlertIcon /></span>
                    <span>{serverError}</span>
                  </div>
                )}

                <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center mt-2">
                  {isSubmitting ? (
                    'Creando cuenta...'
                  ) : (
                    <>
                      Crear cuenta
                      <ArrowIcon />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          <p className="text-sm text-neutral-500 text-center mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-medium text-neutral-900 hover:underline">
              Inicia sesión
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
