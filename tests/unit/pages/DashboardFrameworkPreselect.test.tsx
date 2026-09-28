import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import DashboardPage from '@/pages/DashboardPage';
import PolicySelectionView from '@/components/repositories/PolicySelectionView';
import type { PolicyPage } from '@/types/policy';
import { Category, Framework } from '@/types/enums';

vi.mock('@/api/repositories', () => ({
  uploadZip: vi.fn(),
  cloneGit: vi.fn(),
}));
vi.mock('@/api/policies', () => ({
  listPolicies: vi.fn(),
}));
vi.mock('@/api/policySelection', () => ({
  getPolicySelection: vi.fn(),
  createPolicySelection: vi.fn(),
  updatePolicySelection: vi.fn(),
}));

import * as repositoriesApi from '@/api/repositories';
import * as policiesApi from '@/api/policies';
import * as policySelectionApi from '@/api/policySelection';

const REPO_ID = 'c1111111-1111-1111-1111-111111111111';

const policies: PolicyPage = {
  content: [
    {
      id: 'owasp-1',
      name: 'Prevención de SQL Injection con consultas parametrizadas',
      description: '',
      category: Category.SQL_INJECTION,
      framework: Framework.OWASP_TOP_10_2021,
      controlId: 'A03:2021',
      status: 'ACTIVE',
      version: 1,
      weight: 90,
      createdAt: '2026-08-01T00:00:00Z',
      createdById: null,
      executable: true,
      rulesCount: 1,
    },
    {
      id: 'owasp-2',
      name: 'Codificación de salida HTML',
      description: '',
      category: Category.XSS,
      framework: Framework.OWASP_TOP_10_2021,
      controlId: 'A03:2021',
      status: 'ACTIVE',
      version: 1,
      weight: 85,
      createdAt: '2026-08-01T00:00:00Z',
      createdById: null,
      executable: true,
      rulesCount: 1,
    },
    {
      id: 'iso-1',
      name: 'Control de acceso a datos por rol',
      description: '',
      category: Category.SQL_INJECTION,
      framework: Framework.ISO_27001,
      controlId: 'A.9.4.1',
      status: 'ACTIVE',
      version: 1,
      weight: 75,
      createdAt: '2026-08-01T00:00:00Z',
      createdById: null,
      executable: true,
      rulesCount: 1,
    },
  ],
  totalElements: 3,
  totalPages: 1,
  number: 0,
  size: 100,
  first: true,
  last: true,
};

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/repositories/:repoId/policy-selection" element={<PolicySelectionView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('dashboard framework preselection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(policiesApi.listPolicies).mockResolvedValue(policies);
    vi.mocked(repositoriesApi.uploadZip).mockResolvedValue({
      id: REPO_ID,
      status: 'READY_FOR_ANALYSIS',
      sourceType: 'ZIP',
      originalName: 'demo.zip',
      gitUrl: null,
      branch: null,
      fileCount: 3,
      errorMessage: null,
      createdAt: '2026-08-26T00:00:00Z',
      expiresAt: '2026-08-27T00:00:00Z',
    });
    vi.mocked(policySelectionApi.getPolicySelection).mockRejectedValue(
      new AxiosError('Not Found', '404', undefined, undefined, {
        status: 404,
        data: {},
        statusText: 'Not Found',
        headers: {},
        // @ts-expect-error minimal mock config, not used by the hook
        config: {},
      }),
    );
  });

  it('clicking a framework card, then uploading, preselects that framework\'s policies on the selection screen', async () => {
    const user = userEvent.setup();
    renderApp();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /OWASP Top 10/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /OWASP Top 10/i }));
    expect(screen.getByText(/Framework preseleccionado:/i)).toBeInTheDocument();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['contenido'], 'proyecto.zip', { type: 'application/zip' });
    await user.upload(fileInput, file);

    await user.click(screen.getByRole('button', { name: /subir y continuar/i }));

    await waitFor(() => {
      expect(repositoriesApi.uploadZip).toHaveBeenCalledWith(file);
    });

    // Landed on the policy-selection screen for the new repo, framework param applied.
    await waitFor(() => {
      expect(screen.getByText('Selección de políticas')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/Se preseleccionaron 2 políticas de/i)).toBeInTheDocument();
    });

    const owaspCheckbox1 = screen.getByRole('checkbox', {
      name: /Prevención de SQL Injection con consultas parametrizadas/i,
    }) as HTMLInputElement;
    const owaspCheckbox2 = screen.getByRole('checkbox', { name: /Codificación de salida HTML/i }) as HTMLInputElement;

    expect(owaspCheckbox1.checked).toBe(true);
    expect(owaspCheckbox2.checked).toBe(true);

    // The table itself also filtered down to the preselected framework, so
    // the ISO policy isn't even shown — not just left unchecked.
    expect(screen.queryByText('Control de acceso a datos por rol')).not.toBeInTheDocument();
  });
});
