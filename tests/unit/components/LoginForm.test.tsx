import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginForm from '@/components/auth/LoginForm';
import { AuthContext } from '@/store/authStore';
import type { UserResponse } from '@/types/auth';

vi.mock('@/api/auth', () => ({
  login: vi.fn(),
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
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
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
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'secret');
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
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Credenciales inválidas');
    });
  });
});
