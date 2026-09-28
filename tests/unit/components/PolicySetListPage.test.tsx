import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PolicySetListPage from '@/components/policySets/PolicySetListPage';
import * as policySetsApi from '@/api/policySets';
import type { PolicySetPage, PolicySetResponse } from '@/types/policySet';

vi.mock('@/api/policySets');
vi.mock('@/store/authStore', () => ({
  useAuth: () => ({
    user: { id: 'u1', username: 'dev', roles: ['DEVELOPER'] },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    setLoading: vi.fn(),
  }),
}));

function stubSet(id: string, name: string, status: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE'): PolicySetResponse {
  return {
    id, name, description: 'desc', status, version: 1,
    policyIds: ['p1', 'p2'], policyNames: ['Política A', 'Política B'],
    createdAt: '2026-09-01T00:00:00Z', createdById: 'u1', updatedAt: '2026-09-01T00:00:00Z',
  };
}

function page(content: PolicySetResponse[], overrides: Partial<PolicySetPage> = {}): PolicySetPage {
  return { content, page: 0, size: 10, totalElements: content.length, totalPages: 1, message: null, ...overrides };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/policy-sets']}>
        <Routes>
          <Route path="/policy-sets" element={<PolicySetListPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PolicySetListPage catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('escenario 1: lists active Policy Sets by default and shows totalElements from pagination metadata', async () => {
    vi.mocked(policySetsApi.listPolicySets).mockResolvedValue(
      page([stubSet('ps-1', 'Perfil A'), stubSet('ps-2', 'Perfil B')], { totalElements: 9 }),
    );
    renderPage();

    await waitFor(() => {
      expect(policySetsApi.listPolicySets).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ACTIVE', page: 0, size: 10 }),
      );
    });
    expect(await screen.findByText('9 Policy Sets')).toBeInTheDocument();
    expect(screen.getByText('Perfil A')).toBeInTheDocument();
  });

  it('escenario 3: switching the status filter to Archivados requests status=ARCHIVED', async () => {
    const user = userEvent.setup();
    vi.mocked(policySetsApi.listPolicySets).mockResolvedValue(page([stubSet('ps-1', 'Perfil A')]));
    renderPage();
    await screen.findByText('Perfil A');

    vi.mocked(policySetsApi.listPolicySets).mockResolvedValue(
      page([stubSet('ps-3', 'Perfil Archivado', 'ARCHIVED')]),
    );
    await user.selectOptions(screen.getByLabelText(/filtrar por estado/i), 'ARCHIVED');

    await waitFor(() => {
      expect(policySetsApi.listPolicySets).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ARCHIVED' }),
      );
    });
    expect(await screen.findByText('Perfil Archivado')).toBeInTheDocument();
  });

  it('escenario 4: catálogo vacío shows the backend-provided create-one message', async () => {
    vi.mocked(policySetsApi.listPolicySets).mockResolvedValue(
      page([], { totalElements: 0, message: 'No hay Policy Sets registrados. Cree uno para estandarizar sus análisis.' }),
    );
    renderPage();

    expect(await screen.findByText('No hay Policy Sets registrados. Cree uno para estandarizar sus análisis.'))
      .toBeInTheDocument();
  });

  it('escenario 5: typing in the search box forwards search= to the API (debounced)', async () => {
    const user = userEvent.setup();
    vi.mocked(policySetsApi.listPolicySets).mockResolvedValue(page([stubSet('ps-1', 'Perfil PDG ICESI')]));
    renderPage();
    await screen.findByText('Perfil PDG ICESI');

    await user.type(screen.getByLabelText(/buscar policy set por nombre/i), 'ICESI');

    await waitFor(() => {
      expect(policySetsApi.listPolicySets).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'ICESI' }),
      );
    }, { timeout: 2000 });
  });

  it('shows pagination controls and advances to the next page', async () => {
    const user = userEvent.setup();
    vi.mocked(policySetsApi.listPolicySets).mockResolvedValue(
      page([stubSet('ps-1', 'Perfil A')], { totalElements: 15, totalPages: 2, page: 0 }),
    );
    renderPage();
    await screen.findByText('Perfil A');

    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();

    vi.mocked(policySetsApi.listPolicySets).mockResolvedValue(
      page([stubSet('ps-2', 'Perfil B')], { totalElements: 15, totalPages: 2, page: 1 }),
    );
    await user.click(screen.getByRole('button', { name: /siguiente/i }));

    await waitFor(() => {
      expect(policySetsApi.listPolicySets).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
    });
  });
});
