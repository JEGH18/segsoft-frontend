import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ResetPassword from '@/components/auth/ResetPassword';

vi.mock('@/api/auth', () => ({
  resetPassword: vi.fn(),
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

const STRONG = 'Clave-Recuperada-2026!';
const DONE = 'Tu contraseña cambió y cerramos las sesiones abiertas. Ya puedes iniciar sesión con la nueva.';

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fill(password: string, confirm = password) {
  await userEvent.type(screen.getByLabelText(/^contraseña nueva$/i), password);
  await userEvent.type(screen.getByLabelText(/confirmar contraseña/i), confirm);
  await userEvent.click(screen.getByRole('button', { name: /cambiar contraseña/i }));
}

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends the token with the new password and then points to the login', async () => {
    vi.mocked(authApi.resetPassword).mockResolvedValue(DONE);
    renderAt('/reset-password?token=abc_DEF-123');

    await fill(STRONG);

    expect(authApi.resetPassword).toHaveBeenCalledTimes(1);
    expect(authApi.resetPassword).toHaveBeenCalledWith('abc_DEF-123', STRONG);
    expect(await screen.findByRole('status')).toHaveTextContent(DONE);
    expect(screen.getByRole('link', { name: /^iniciar sesión$/i })).toHaveAttribute('href', '/login');
  });

  it('ticks the password rules as the user types', async () => {
    renderAt('/reset-password?token=abc');

    await userEvent.type(screen.getByLabelText(/^contraseña nueva$/i), 'abc');

    const rules = screen.getByRole('list', { name: /requisitos de la contraseña/i });
    expect(rules.querySelector('[data-ok="true"]')).toHaveTextContent(/minúscula/i);
    expect(rules.querySelectorAll('[data-ok="false"]')).toHaveLength(4);
  });

  it('can show each password field', async () => {
    renderAt('/reset-password?token=abc');
    const field = screen.getByLabelText(/^contraseña nueva$/i);
    expect(field).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByRole('button', { name: /^mostrar contraseña$/i }));

    expect(field).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText(/confirmar contraseña/i)).toHaveAttribute('type', 'password');
  });

  it('does not call the API with a weak password or one that does not match', async () => {
    renderAt('/reset-password?token=abc');

    await fill('corta');
    expect(screen.getByText(/no cumple todos los requisitos/i)).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText(/^contraseña nueva$/i));
    await userEvent.clear(screen.getByLabelText(/confirmar contraseña/i));
    await fill(STRONG, STRONG + 'x');
    expect(screen.getByText(/no coinciden/i)).toBeInTheDocument();

    expect(authApi.resetPassword).not.toHaveBeenCalled();
  });

  it('keeps the form when the server rejects the password, since the link still works', async () => {
    vi.mocked(authApi.resetPassword).mockRejectedValue({
      response: {
        status: 400,
        data: { errorCode: 'VALIDATION_ERROR', message: 'La contraseña nueva debe ser distinta de la actual.' },
      },
    });
    renderAt('/reset-password?token=abc');

    await fill(STRONG);

    expect(await screen.findByText(/distinta de la actual/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cambiar contraseña/i })).toBeEnabled();
  });

  it('offers a new link when this one was used or expired', async () => {
    vi.mocked(authApi.resetPassword).mockRejectedValue({
      response: {
        status: 400,
        data: {
          errorCode: 'INVALID_RESET_TOKEN',
          message: 'El enlace para cambiar la contraseña no es válido, ya se usó o venció. Pide uno nuevo.',
        },
      },
    });
    renderAt('/reset-password?token=vencido');

    await fill(STRONG);

    expect(await screen.findByRole('alert')).toHaveTextContent(/ya se usó o venció/i);
    expect(screen.getByRole('link', { name: /pedir un enlace nuevo/i })).toHaveAttribute('href', '/forgot-password');
    expect(screen.queryByRole('button', { name: /cambiar contraseña/i })).not.toBeInTheDocument();
  });

  it('explains a link without token and shows no form', () => {
    renderAt('/reset-password');

    expect(screen.getByRole('alert')).toHaveTextContent(/no tiene un token/i);
    expect(screen.queryByLabelText(/^contraseña nueva$/i)).not.toBeInTheDocument();
    expect(authApi.resetPassword).not.toHaveBeenCalled();
  });
});
