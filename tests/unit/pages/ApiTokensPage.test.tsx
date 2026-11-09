import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ApiTokensPage from '@/pages/ApiTokensPage';
import { AuthContext } from '@/store/authStore';
import type { ApiToken } from '@/types/apiToken';

vi.mock('@/api/apiTokens', () => ({
  listApiTokens: vi.fn(),
  createApiToken: vi.fn(),
  revokeApiToken: vi.fn(),
}));

import * as apiTokensApi from '@/api/apiTokens';

const TOKEN_VALUE = 'pdgseg_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';

function token(overrides: Partial<ApiToken> = {}): ApiToken {
  return {
    id: 't1',
    name: 'GitHub Actions',
    tokenPrefix: 'pdgseg_abcde',
    ownerUsername: 'dev',
    createdAt: '2026-11-01T10:00:00Z',
    expiresAt: '2027-01-30T10:00:00Z',
    lastUsedAt: null,
    expired: false,
    ...overrides,
  };
}

function renderPage(roles: string[] = ['DEVELOPER']) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider
        value={{
          user: { id: 'u1', username: 'dev', roles },
          isAuthenticated: true,
          isLoading: false,
          login: vi.fn(),
          logout: vi.fn(),
          setLoading: vi.fn(),
        }}
      >
        <MemoryRouter>
          <ApiTokensPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('ApiTokensPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiTokensApi.listApiTokens).mockResolvedValue([]);
  });

  it('lists the user\'s tokens with their prefix, never their value, and flags expired ones', async () => {
    vi.mocked(apiTokensApi.listApiTokens).mockResolvedValue([
      token(),
      token({ id: 't2', name: 'Viejo', tokenPrefix: 'pdgseg_zzzzz', expired: true }),
    ]);
    renderPage();

    const table = await screen.findByRole('table');
    expect(within(table).getByText('GitHub Actions')).toBeInTheDocument();
    expect(within(table).getByText('pdgseg_abcde…')).toBeInTheDocument();
    expect(within(table).getByText('Vencido')).toBeInTheDocument();
    expect(within(table).getAllByText('Nunca')).toHaveLength(2);
    expect(within(table).queryByText('Dueño')).not.toBeInTheDocument();
  });

  it('creates a token with the chosen duration and shows its value once', async () => {
    vi.mocked(apiTokensApi.createApiToken).mockResolvedValue({
      id: 't9', name: 'CI', token: TOKEN_VALUE, tokenPrefix: 'pdgseg_abcde',
      createdAt: '2026-11-09T12:00:00Z', expiresAt: '2026-12-09T12:00:00Z',
    });
    renderPage();
    await screen.findByText(/aún no tienes tokens/i);

    await userEvent.type(screen.getByLabelText('Nombre'), '  CI  ');
    await userEvent.selectOptions(screen.getByLabelText('Duración'), '30');
    await userEvent.click(screen.getByRole('button', { name: /crear token/i }));

    await waitFor(() => {
      expect(apiTokensApi.createApiToken).toHaveBeenCalledWith({ name: 'CI', expiresInDays: 30 });
    });
    expect(screen.getByLabelText('Valor del token')).toHaveTextContent(TOKEN_VALUE);
    expect(screen.getByText(/no se volverá a mostrar/i)).toBeInTheDocument();
    expect(apiTokensApi.listApiTokens).toHaveBeenCalledTimes(2);

    await userEvent.click(screen.getByRole('button', { name: /ya lo guardé/i }));
    expect(screen.queryByText(TOKEN_VALUE)).not.toBeInTheDocument();
  });

  it('shows the server message when the user already has too many tokens', async () => {
    vi.mocked(apiTokensApi.createApiToken).mockRejectedValue({
      response: { status: 409, data: { message: 'Ya tienes 10 tokens de API vigentes. Revoca alguno que no uses antes de crear otro.' } },
    });
    renderPage();

    await userEvent.type(screen.getByLabelText('Nombre'), 'Otro');
    await userEvent.click(screen.getByRole('button', { name: /crear token/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya tienes 10 tokens de API vigentes');
  });

  it('does not create a token without a name', async () => {
    renderPage();
    expect(screen.getByRole('button', { name: /crear token/i })).toBeDisabled();
  });

  it('revokes a token only after confirming', async () => {
    vi.mocked(apiTokensApi.listApiTokens).mockResolvedValue([token()]);
    vi.mocked(apiTokensApi.revokeApiToken).mockResolvedValue();
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /revocar github actions/i }));
    expect(apiTokensApi.revokeApiToken).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /sí, revocar/i }));
    await waitFor(() => expect(apiTokensApi.revokeApiToken).toHaveBeenCalledWith('t1'));
  });

  it('shows the owner column to a security admin', async () => {
    vi.mocked(apiTokensApi.listApiTokens).mockResolvedValue([token({ ownerUsername: 'otro.dev' })]);
    renderPage(['SECURITY_ADMIN']);

    const table = await screen.findByRole('table');
    expect(within(table).getByText('Dueño')).toBeInTheDocument();
    expect(within(table).getByText('otro.dev')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /tokens de todos los usuarios/i })).toBeInTheDocument();
  });
});
