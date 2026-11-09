import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginForm from '@/components/auth/LoginForm';
import { AuthContext } from '@/store/authStore';
import type { UserResponse } from '@/types/auth';
import { readSessionEndedNotice, saveSessionEndedNotice } from '@/utils/sessionNotice';

vi.mock('@/api/auth', () => ({
  login: vi.fn(),
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

const mockLogin = vi.fn();

function renderLoginForm() {
  const contextValue = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: mockLogin,
    logout: vi.fn(),
    setLoading: vi.fn(),
  };

  return render(
    <MemoryRouter>
      <AuthContext.Provider value={contextValue}>
        <LoginForm />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders username and password fields', () => {
    renderLoginForm();
    expect(screen.getByLabelText(/usuario/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^contraseña$/i)).toBeInTheDocument();
  });

  it('shows and hides the password with the eye button', async () => {
    renderLoginForm();
    const password = screen.getByLabelText(/^contraseña$/i);
    expect(password).toHaveAttribute('type', 'password');

    await userEvent.type(password, 'secret');
    await userEvent.click(screen.getByRole('button', { name: /^mostrar contraseña$/i }));
    expect(password).toHaveAttribute('type', 'text');
    expect(password).toHaveValue('secret');

    await userEvent.click(screen.getByRole('button', { name: /^ocultar contraseña$/i }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('links to account creation', () => {
    renderLoginForm();
    expect(screen.getByRole('link', { name: /crear cuenta/i })).toHaveAttribute('href', '/register');
  });

  it('shows error when submitting without username', async () => {
    renderLoginForm();
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));
    await waitFor(() => {
      expect(screen.getByText(/usuario es requerido/i)).toBeInTheDocument();
    });
  });

  it('shows error when submitting without password', async () => {
    renderLoginForm();
    await userEvent.type(screen.getByLabelText(/usuario/i), 'alice');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));
    await waitFor(() => {
      expect(screen.getByText(/contraseña es requerida/i)).toBeInTheDocument();
    });
  });

  it('calls login API with correct data and does NOT store token in localStorage', async () => {
    const mockUser: UserResponse = { id: '1', username: 'alice', roles: ['DEVELOPER'] };
    vi.mocked(authApi.login).mockResolvedValue({
      accessToken: 'at',
      refreshToken: 'rt',
      tokenType: 'Bearer',
      roles: ['DEVELOPER'],
    });
    vi.mocked(authApi.me).mockResolvedValue(mockUser);
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    renderLoginForm();
    await userEvent.type(screen.getByLabelText(/usuario/i), 'alice');
    await userEvent.type(screen.getByLabelText(/^contraseña$/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({ username: 'alice', password: 'secret' });
    });
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it('shows server error message when login fails', async () => {
    vi.mocked(authApi.login).mockRejectedValue({
      response: { data: { message: 'Credenciales inválidas' } },
    });

    renderLoginForm();
    await userEvent.type(screen.getByLabelText(/usuario/i), 'alice');
    await userEvent.type(screen.getByLabelText(/^contraseña$/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Credenciales inválidas');
    });
  });

  it('offers to resend the link when the email is not verified', async () => {
    vi.mocked(authApi.login).mockRejectedValue({
      response: {
        status: 403,
        data: {
          errorCode: 'EMAIL_NOT_VERIFIED',
          message: 'Debes verificar tu correo antes de iniciar sesión.',
          email: 'alice@example.com',
        },
      },
    });
    vi.mocked(authApi.resendVerification).mockResolvedValue();

    renderLoginForm();
    await userEvent.type(screen.getByLabelText(/usuario/i), 'alice');
    await userEvent.type(screen.getByLabelText(/^contraseña$/i), 'Correcta-2026!');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    expect(await screen.findByText(/debes verificar tu correo/i)).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^reenviar correo$/i }));

    expect(authApi.resendVerification).toHaveBeenCalledWith('alice@example.com');
    expect(await screen.findByText(/te enviamos un enlace nuevo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reenviar correo \(\d+ s\)/i })).toBeDisabled();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('shows the attempts left and, once locked, how to unlock the account', async () => {
    vi.mocked(authApi.login)
      .mockRejectedValueOnce({
        response: {
          status: 401,
          data: {
            errorCode: 'UNAUTHORIZED',
            message: 'Credenciales inválidas. Te queda 1 intento antes de que la cuenta se bloquee durante 30 minutos.',
            attemptsLeft: 1,
          },
        },
      })
      .mockRejectedValueOnce({
        response: {
          status: 423,
          data: {
            errorCode: 'ACCOUNT_LOCKED',
            message:
              'Demasiados intentos fallidos: la cuenta quedó bloqueada durante 30 minutos. Te enviamos un correo con un enlace para desbloquearla.',
            minutesLeft: 30,
          },
        },
      });

    renderLoginForm();
    await userEvent.type(screen.getByLabelText(/usuario/i), 'alice');
    await userEvent.type(screen.getByLabelText(/^contraseña$/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));
    expect(await screen.findByText(/te queda 1 intento/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));
    expect(await screen.findByText(/te enviamos un correo con un enlace para desbloquearla/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reenviar correo/i })).not.toBeInTheDocument();
  });

  it('does not offer to resend for other login errors', async () => {
    vi.mocked(authApi.login).mockRejectedValue({
      response: { status: 401, data: { errorCode: 'UNAUTHORIZED', message: 'Credenciales inválidas' } },
    });

    renderLoginForm();
    await userEvent.type(screen.getByLabelText(/usuario/i), 'alice');
    await userEvent.type(screen.getByLabelText(/^contraseña$/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reenviar correo/i })).not.toBeInTheDocument();
  });
  it('says why the previous session was ended, only once', () => {
    saveSessionEndedNotice('La cuenta está bloqueada por demasiados intentos fallidos. Intenta de nuevo en 30 minutos.');

    const { unmount } = renderLoginForm();
    expect(screen.getByRole('alert')).toHaveTextContent('La cuenta está bloqueada');
    expect(readSessionEndedNotice()).toBeNull();
    unmount();

    renderLoginForm();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
