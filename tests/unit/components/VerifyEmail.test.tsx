import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VerifyEmail from '@/components/auth/VerifyEmail';
import { AuthContext } from '@/store/authStore';
import type { UserResponse } from '@/types/auth';

vi.mock('@/api/auth', () => ({
  verifyEmail: vi.fn(),
  resendVerification: vi.fn(),
  me: vi.fn(),
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

function renderAt(url: string) {
  const contextValue = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: mockLogin,
    logout: vi.fn(),
    setLoading: vi.fn(),
  };

  return render(
    <MemoryRouter initialEntries={[url]}>
      <AuthContext.Provider value={contextValue}>
        <Routes>
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/" element={<p>Dashboard</p>} />
          <Route path="/login" element={<p>Pantalla de login</p>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('VerifyEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies the token once, starts the session and goes to the dashboard', async () => {
    const user: UserResponse = { id: '1', username: 'juan', email: 'juan@example.com', roles: ['DEVELOPER'] };
    vi.mocked(authApi.verifyEmail).mockResolvedValue({
      accessToken: 'at',
      refreshToken: 'rt',
      tokenType: 'Bearer',
      roles: ['DEVELOPER'],
    });
    vi.mocked(authApi.me).mockResolvedValue(user);

    renderAt('/verify-email?token=abc_DEF-123');

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    expect(authApi.verifyEmail).toHaveBeenCalledTimes(1);
    expect(authApi.verifyEmail).toHaveBeenCalledWith('abc_DEF-123');
    expect(mockLogin).toHaveBeenCalledWith(user, 'at');
  });

  it('shows why the link failed and lets the user ask for a new one', async () => {
    vi.mocked(authApi.verifyEmail).mockRejectedValue({
      response: {
        status: 400,
        data: {
          errorCode: 'INVALID_VERIFICATION_TOKEN',
          message: 'El enlace de verificación no es válido, ya se usó o venció. Pide uno nuevo.',
        },
      },
    });
    vi.mocked(authApi.resendVerification).mockResolvedValue();

    renderAt('/verify-email?token=vencido');

    expect(await screen.findByText(/ya se usó o venció/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();

    const resend = screen.getByRole('button', { name: /^reenviar correo$/i });
    expect(resend).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/escribe tu correo/i), ' Juan@Example.com ');
    expect(resend).toBeEnabled();
    await userEvent.click(resend);

    await waitFor(() => {
      expect(authApi.resendVerification).toHaveBeenCalledWith('juan@example.com');
    });
    expect(await screen.findByText(/te enviamos un enlace nuevo/i)).toBeInTheDocument();
  });

  it('explains a link without token and does not call the API', () => {
    renderAt('/verify-email');

    expect(screen.getByRole('alert')).toHaveTextContent(/no tiene un token/i);
    expect(authApi.verifyEmail).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: /iniciar sesión/i })).toHaveAttribute('href', '/login');
  });
});
