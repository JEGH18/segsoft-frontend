import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ForgotPassword from '@/components/auth/ForgotPassword';

vi.mock('@/api/auth', () => ({
  forgotPassword: vi.fn(),
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

const SENT = 'Si el correo pertenece a una cuenta, te enviamos un enlace para cambiar la contraseña. Vence en 30 minutos.';

function renderPage() {
  return render(
    <MemoryRouter>
      <ForgotPassword />
    </MemoryRouter>,
  );
}

describe('ForgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends the normalized email and shows the same answer whether or not it has an account', async () => {
    vi.mocked(authApi.forgotPassword).mockResolvedValue(SENT);
    renderPage();

    await userEvent.type(screen.getByLabelText(/correo/i), '  Juan@Example.com ');
    await userEvent.click(screen.getByRole('button', { name: /enviar enlace/i }));

    expect(authApi.forgotPassword).toHaveBeenCalledWith('juan@example.com');
    expect(await screen.findByText(SENT)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /revisa tu correo/i })).toBeInTheDocument();
  });

  it('does not call the API with an invalid email', async () => {
    renderPage();

    await userEvent.type(screen.getByLabelText(/correo/i), 'no-es-un-correo');
    await userEvent.click(screen.getByRole('button', { name: /enviar enlace/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/correo válido/i);
    expect(authApi.forgotPassword).not.toHaveBeenCalled();
  });

  it('shows the error of the server, such as too many requests', async () => {
    vi.mocked(authApi.forgotPassword).mockRejectedValue({
      response: { status: 429, data: { message: 'Demasiados intentos desde esta red. Intenta más tarde.' } },
    });
    renderPage();

    await userEvent.type(screen.getByLabelText(/correo/i), 'juan@example.com');
    await userEvent.click(screen.getByRole('button', { name: /enviar enlace/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/demasiados intentos/i);
  });

  it('links back to the login', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /iniciar sesión/i })).toHaveAttribute('href', '/login');
  });
});
