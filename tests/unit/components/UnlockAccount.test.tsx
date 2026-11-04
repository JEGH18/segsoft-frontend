import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import UnlockAccount from '@/components/auth/UnlockAccount';

vi.mock('@/api/auth', () => ({
  unlockAccount: vi.fn(),
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

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/unlock-account" element={<UnlockAccount />} />
        <Route path="/login" element={<p>Pantalla de login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('UnlockAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends the token once and confirms the unlock without logging in', async () => {
    vi.mocked(authApi.unlockAccount).mockResolvedValue('Tu cuenta quedó desbloqueada. Ya puedes iniciar sesión.');

    renderAt('/unlock-account?token=abc_DEF-123');

    expect(await screen.findByText(/tu cuenta quedó desbloqueada/i)).toBeInTheDocument();
    expect(authApi.unlockAccount).toHaveBeenCalledTimes(1);
    expect(authApi.unlockAccount).toHaveBeenCalledWith('abc_DEF-123');
    expect(screen.getByRole('link', { name: /iniciar sesión/i })).toHaveAttribute('href', '/login');
  });

  it('explains an invalid or expired link', async () => {
    vi.mocked(authApi.unlockAccount).mockRejectedValue({
      response: {
        status: 400,
        data: {
          errorCode: 'INVALID_UNLOCK_TOKEN',
          message: 'El enlace de desbloqueo no es válido, ya se usó o venció.',
        },
      },
    });

    renderAt('/unlock-account?token=vencido');

    expect(await screen.findByRole('alert')).toHaveTextContent(/ya se usó o venció/i);
  });

  it('explains a link without token and does not call the API', () => {
    renderAt('/unlock-account');

    expect(screen.getByRole('alert')).toHaveTextContent(/no tiene un token/i);
    expect(authApi.unlockAccount).not.toHaveBeenCalled();
  });
});
