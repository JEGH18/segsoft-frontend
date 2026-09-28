import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PolicySetDetailPage from '@/components/policySets/PolicySetDetailPage';
import * as policySetsApi from '@/api/policySets';
import * as policiesApi from '@/api/policies';
import { Category, Framework } from '@/types/enums';
import type { PolicySetDetailResponse } from '@/types/policySet';
import type { PolicyResponse } from '@/types/policy';

vi.mock('@/api/policySets');
vi.mock('@/api/policies');
vi.mock('@/store/authStore', () => ({
  useAuth: () => ({
    user: { id: 'u1', username: 'admin', roles: ['SECURITY_ADMIN'] },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    setLoading: vi.fn(),
  }),
}));

const POLICY_SET_ID = 'ps-1111-1111';

const activeSet: PolicySetDetailResponse = {
  id: POLICY_SET_ID,
  name: 'Perfil PDG ICESI',
  description: 'Conjunto base para validación de proyectos de grado',
  status: 'ACTIVE',
  version: 3,
  policyIds: ['p1'],
  policyNames: ['Prevención de SQL Injection'],
  policies: [
    { id: 'p1', name: 'Prevención de SQL Injection', framework: 'OWASP_TOP_10_2021', category: 'SQL_INJECTION' },
  ],
  categoryCoverage: {
    SQL_INJECTION: 1, XSS: 0, AUTHENTICATION_FAILURE: 0, INSECURE_DATA_HANDLING: 0, DEPENDENCY_VULNERABILITY: 0,
  },
  usageCount: 0,
  createdAt: '2026-09-01T00:00:00Z',
  createdById: 'u1',
  updatedAt: '2026-09-10T00:00:00Z',
};

function stubPolicy(id: string, name: string): PolicyResponse {
  return {
    id,
    name,
    description: 'Descripción con la longitud mínima requerida.',
    category: Category.SQL_INJECTION,
    framework: Framework.OWASP_TOP_10_2021,
    controlId: 'A03:2021',
    status: 'ACTIVE',
    version: 1,
    weight: 50,
    applicability: {},
    createdAt: '2026-08-01T00:00:00Z',
    createdById: 'u1',
    executable: true,
    rulesCount: 1,
  };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/policy-sets/${POLICY_SET_ID}`]}>
        <Routes>
          <Route path="/policy-sets/:id" element={<PolicySetDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PolicySetDetailPage lifecycle UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(policySetsApi.getPolicySetById).mockResolvedValue(activeSet);
    vi.mocked(policySetsApi.getPolicySetAuditLog).mockResolvedValue([]);
    vi.mocked(policiesApi.listPolicies).mockResolvedValue({
      content: [stubPolicy('p1', 'Prevención de SQL Injection'), stubPolicy('p2', 'Control de acceso a datos por rol')],
      totalElements: 2,
      totalPages: 1,
      number: 0,
      size: 100,
      first: true,
      last: true,
    });
  });

  it('escenario 2: shows categoryCoverage across all 5 categories, usageCount, and full policy objects', async () => {
    vi.mocked(policySetsApi.getPolicySetById).mockResolvedValue({
      ...activeSet,
      usageCount: 3,
      categoryCoverage: {
        SQL_INJECTION: 1, XSS: 2, AUTHENTICATION_FAILURE: 0, INSECURE_DATA_HANDLING: 0, DEPENDENCY_VULNERABILITY: 0,
      },
    });
    renderPage();

    await waitFor(() => expect(screen.getByDisplayValue('Perfil PDG ICESI')).toBeInTheDocument());

    expect(screen.getByText(/aplicado a 3 repositorios/i)).toBeInTheDocument();
    const coverageSection = screen.getByText('Cobertura por categoría').closest('div') as HTMLElement;
    expect(coverageSection).toBeInTheDocument();
    expect(within(coverageSection).getByText('SQL Injection')).toBeInTheDocument();
    expect(within(coverageSection).getByText('XSS')).toBeInTheDocument();
  });

  it('subtarea 5: "Aplicar a repositorio" navigates to the Dashboard with this Policy Set preselected', async () => {
    const user = userEvent.setup();
    vi.mocked(policySetsApi.listPolicySets).mockResolvedValue({
      content: [{ ...activeSet }], page: 0, size: 100, totalElements: 1, totalPages: 1, message: null,
    });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { default: DashboardPage } = await import('@/pages/DashboardPage');
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[`/policy-sets/${POLICY_SET_ID}`]}>
          <Routes>
            <Route path="/policy-sets/:id" element={<PolicySetDetailPage />} />
            <Route path="/" element={<DashboardPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByDisplayValue('Perfil PDG ICESI')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /aplicar a repositorio/i }));

    expect(await screen.findByText(/policy set preseleccionado/i)).toBeInTheDocument();
  });

  it('shows the current composition preselected as checked', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Perfil PDG ICESI')).toBeInTheDocument();
    });

    const p1Checkbox = await screen.findByRole('checkbox', { name: /Prevención de SQL Injection/i });
    expect(p1Checkbox).toBeChecked();
    const p2Checkbox = screen.getByRole('checkbox', { name: /Control de acceso a datos por rol/i });
    expect(p2Checkbox).not.toBeChecked();
  });

  it('saves an edit with only the changed fields, incrementing composition', async () => {
    const user = userEvent.setup();
    vi.mocked(policySetsApi.updatePolicySet).mockResolvedValue({ ...activeSet, version: 4, policyIds: ['p1', 'p2'] });
    renderPage();

    await waitFor(() => expect(screen.getByDisplayValue('Perfil PDG ICESI')).toBeInTheDocument());

    const p2Checkbox = await screen.findByRole('checkbox', { name: /Control de acceso a datos por rol/i });
    await user.click(p2Checkbox);

    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(policySetsApi.updatePolicySet).toHaveBeenCalledWith(
        POLICY_SET_ID,
        expect.objectContaining({ policyIds: expect.arrayContaining(['p1', 'p2']) }),
      );
    });
  });

  it('archiving asks for confirmation before calling the API', async () => {
    const user = userEvent.setup();
    vi.mocked(policySetsApi.archivePolicySet).mockResolvedValue(undefined);
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^archivar$/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^archivar$/i }));

    const dialog = await screen.findByRole('alertdialog');
    expect(policySetsApi.archivePolicySet).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: /^archivar$/i }));

    await waitFor(() => {
      expect(policySetsApi.archivePolicySet).toHaveBeenCalled();
    });
  });

  it('shows the 409 message when archiving is blocked by a running analysis', async () => {
    const user = userEvent.setup();
    vi.mocked(policySetsApi.archivePolicySet).mockRejectedValue({
      response: { data: { message: 'No se puede archivar: existen análisis en curso que dependen de este Policy Set' } },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^archivar$/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /^archivar$/i }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /^archivar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/análisis en curso que dependen de este policy set/i)).toBeInTheDocument();
    });
    // Status badge must NOT have flipped to Archivado since the backend rejected it.
    expect(screen.getByRole('status', { name: /estado: activo/i })).toBeInTheDocument();
  });

  it('after archiving succeeds, the badge updates to Archivado and editing is disabled', async () => {
    const user = userEvent.setup();
    vi.mocked(policySetsApi.archivePolicySet).mockResolvedValue(undefined);
    vi.mocked(policySetsApi.getPolicySetById)
      .mockResolvedValueOnce(activeSet)
      .mockResolvedValue({ ...activeSet, status: 'ARCHIVED' });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('status', { name: /estado: activo/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^archivar$/i }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /^archivar$/i }));

    await waitFor(() => {
      expect(screen.getByRole('status', { name: /estado: archivado/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /^archivar$/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toBeDisabled();
  });

  it('an archived Policy Set still shows up (not deleted) with a Restaurar action, asking for confirmation first', async () => {
    const user = userEvent.setup();
    const archivedSet: PolicySetDetailResponse = { ...activeSet, status: 'ARCHIVED' };
    vi.mocked(policySetsApi.getPolicySetById).mockResolvedValue(archivedSet);
    vi.mocked(policySetsApi.restorePolicySet).mockResolvedValue(activeSet);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('status', { name: /estado: archivado/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /^archivar$/i })).not.toBeInTheDocument();

    const restoreButton = screen.getByRole('button', { name: /^restaurar$/i });
    await user.click(restoreButton);

    const dialog = await screen.findByRole('alertdialog');
    expect(policySetsApi.restorePolicySet).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: /^restaurar$/i }));

    await waitFor(() => {
      expect(policySetsApi.restorePolicySet).toHaveBeenCalled();
    });
  });

  it('after restoring succeeds, the badge flips back to Activo and the Restaurar button is replaced by Archivar', async () => {
    const user = userEvent.setup();
    const archivedSet: PolicySetDetailResponse = { ...activeSet, status: 'ARCHIVED' };
    vi.mocked(policySetsApi.restorePolicySet).mockResolvedValue(activeSet);
    vi.mocked(policySetsApi.getPolicySetById)
      .mockResolvedValueOnce(archivedSet)
      .mockResolvedValue(activeSet);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('status', { name: /estado: archivado/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^restaurar$/i }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /^restaurar$/i }));

    await waitFor(() => {
      expect(screen.getByRole('status', { name: /estado: activo/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /^restaurar$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^archivar$/i })).toBeInTheDocument();
  });
});
