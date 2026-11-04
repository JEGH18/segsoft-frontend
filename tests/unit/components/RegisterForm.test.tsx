import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RegisterForm from '@/components/auth/RegisterForm';
import { AuthContext } from '@/store/authStore';

vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  registrationStatus: vi.fn(),
  resendVerification: vi.fn(),
  me: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('@/utils/axiosInstance', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

import * as authApi from '@/api/auth';

const STRONG_PASSWORD = 'Registro-Prueba-2026!';
const mockLogin = vi.fn();

function renderRegisterForm() {
  const contextValue = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: mockLogin,
    logout: vi.fn(),
    setLoading: vi.fn(),
  };

  return render(
    <MemoryRouter initialEntries={['/register']}>
      <AuthContext.Provider value={contextValue}>
        <Routes>
          <Route path="/register" element={<RegisterForm />} />
          <Route path="/" element={<p>Dashboard</p>} />
          <Route path="/login" element={<p>Pantalla de login</p>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

async function fillForm(
  username: string,
  password: string,
  confirmation = password,
  email = `${username.toLowerCase()}@example.com`,
) {
  await userEvent.type(screen.getByLabelText(/^usuario$/i), username);
  if (email) await userEvent.type(screen.getByLabelText(/^correo$/i), email);
  await userEvent.type(screen.getByLabelText(/^contraseña$/i), password);
  await userEvent.type(screen.getByLabelText(/confirmar contraseña/i), confirmation);
  await userEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));
}

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authApi.registrationStatus).mockResolvedValue({ enabled: true });
  });

  it('renders the fields and explains that the account is a Developer', () => {
    renderRegisterForm();
    expect(screen.getByLabelText(/^usuario$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^correo$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^contraseña$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar contraseña/i)).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
  });

  it('marks the password requirements as the user types', async () => {
    renderRegisterForm();
    const rules = screen.getByRole('list', { name: /requisitos de la contraseña/i });
    expect(rules.querySelectorAll('[data-ok="true"]')).toHaveLength(0);

    await userEvent.type(screen.getByLabelText(/^contraseña$/i), 'abcDEF');
    expect(screen.getByText('Una letra mayúscula').closest('li')).toHaveAttribute('data-ok', 'true');
    expect(screen.getByText('Al menos 12 caracteres').closest('li')).toHaveAttribute('data-ok', 'false');

    await userEvent.type(screen.getByLabelText(/^contraseña$/i), '123456!');
    expect(rules.querySelectorAll('[data-ok="true"]')).toHaveLength(5);
  });

  it('validates the username, the email, the password rules and the confirmation before calling the API', async () => {
    renderRegisterForm();
    await fillForm('1malo', 'corta', 'otra', 'sin-arroba');

    await waitFor(() => {
      expect(screen.getByText(/empieza con una letra/i)).toBeInTheDocument();
    });
    expect(screen.getByText('El correo no es válido')).toBeInTheDocument();
    expect(screen.getByText(/no cumple todos los requisitos/i)).toBeInTheDocument();
    expect(screen.getByText(/las contraseñas no coinciden/i)).toBeInTheDocument();
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it('registers a lowercase username and email, and asks to check the inbox without starting a session', async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      username: 'juan.gomez',
      email: 'juan@example.com',
      message: 'Te enviamos un enlace',
    });

    renderRegisterForm();
    await fillForm('Juan.Gomez', STRONG_PASSWORD, STRONG_PASSWORD, '  Juan@Example.com ');

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith({
        username: 'juan.gomez',
        email: 'juan@example.com',
        password: STRONG_PASSWORD,
      });
    });
    expect(await screen.findByRole('heading', { name: /revisa tu correo/i })).toBeInTheDocument();
    expect(screen.getByText('juan@example.com')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: /formulario de registro/i })).not.toBeInTheDocument();
    // The link was just sent: resending waits for the cooldown.
    expect(screen.getByRole('button', { name: /reenviar correo \(60 s\)/i })).toBeDisabled();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('shows a taken email next to the email field', async () => {
    vi.mocked(authApi.register).mockRejectedValue({
      response: { status: 409, data: { errorCode: 'CONFLICT', message: 'Ese correo ya está registrado en otra cuenta' } },
    });

    renderRegisterForm();
    await fillForm('nuevo', STRONG_PASSWORD);

    expect(await screen.findByText('Ese correo ya está registrado en otra cuenta')).toBeInTheDocument();
    expect(screen.getByLabelText(/^correo$/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/^usuario$/i)).toHaveAttribute('aria-invalid', 'false');
  });

  it('shows a taken username next to the username field', async () => {
    vi.mocked(authApi.register).mockRejectedValue({
      response: { status: 409, data: { errorCode: 'CONFLICT', message: 'Ese nombre de usuario ya está en uso' } },
    });

    renderRegisterForm();
    await fillForm('ocupado', STRONG_PASSWORD);

    expect(await screen.findByText('Ese nombre de usuario ya está en uso')).toBeInTheDocument();
    expect(screen.getByLabelText(/^usuario$/i)).toHaveAttribute('aria-invalid', 'true');
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('shows the server password policy error on the password field', async () => {
    vi.mocked(authApi.register).mockRejectedValue({
      response: {
        status: 400,
        data: { errorCode: 'VALIDATION_ERROR', errors: { password: 'La contraseña elegida es demasiado común' } },
      },
    });

    renderRegisterForm();
    await fillForm('nuevo', STRONG_PASSWORD);

    expect(await screen.findByText('La contraseña elegida es demasiado común')).toBeInTheDocument();
  });

  it('shows rate limit errors as a general alert', async () => {
    vi.mocked(authApi.register).mockRejectedValue({
      response: { status: 429, data: { errorCode: 'TOO_MANY_REQUESTS', message: 'Demasiados intentos de registro' } },
    });

    renderRegisterForm();
    await fillForm('nuevo', STRONG_PASSWORD);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Demasiados intentos de registro');
    });
  });

  it('hides the form when registration is disabled', async () => {
    vi.mocked(authApi.registrationStatus).mockResolvedValue({ enabled: false });

    renderRegisterForm();

    expect(await screen.findByText(/el registro de nuevas cuentas está deshabilitado/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^usuario$/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /inicia sesión/i })).toHaveAttribute('href', '/login');
  });
});
