import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import PolicySelectionView from '@/components/repositories/PolicySelectionView';
import PolicySetCreateForm from '@/components/policySets/PolicySetCreateForm';
import type { PolicyPage } from '@/types/policy';
import { Category, Framework } from '@/types/enums';

vi.mock('@/api/policies', () => ({ listPolicies: vi.fn() }));
vi.mock('@/api/policySelection', () => ({
  getPolicySelection: vi.fn(),
  createPolicySelection: vi.fn(),
  updatePolicySelection: vi.fn(),
  applyPolicySet: vi.fn(),
}));
vi.mock('@/api/policySets', () => ({ listPolicySets: vi.fn(), createPolicySet: vi.fn() }));

import * as policiesApi from '@/api/policies';
import * as policySelectionApi from '@/api/policySelection';
import * as policySetsApi from '@/api/policySets';

const REPO_ID = 'c1111111-1111-1111-1111-111111111111';

function policy(id: string, name: string, category: Category, framework: Framework) {
  return {
    id,
    name,
    description: '',
    category,
    framework,
    controlId: null,
    status: 'ACTIVE',
    version: 1,
    weight: 50,
    createdAt: '2026-08-01T00:00:00Z',
    createdById: null,
    executable: true,
    rulesCount: 1,
  };
}

const policies = {
  content: [
    policy('owasp-1', 'Consultas parametrizadas', Category.SQL_INJECTION, Framework.OWASP_TOP_10_2021),
    policy('owasp-2', 'Codificación de salida HTML', Category.XSS, Framework.OWASP_TOP_10_2021),
    policy('iso-1', 'Control de acceso a datos por rol', Category.SQL_INJECTION, Framework.ISO_27001),
  ],
  totalElements: 3,
  totalPages: 1,
  number: 0,
  size: 100,
  first: true,
  last: true,
} as unknown as PolicyPage;

function notFound() {
  return new AxiosError('not found', '404', undefined, undefined, {
    status: 404,
    data: {},
    statusText: 'Not Found',
    headers: {},
    // @ts-expect-error minimal mock config
    config: {},
  });
}

function withClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

function policyCheckbox(name: string) {
  return screen.getByRole('checkbox', { name: `Seleccionar ${name}` }) as HTMLInputElement;
}

describe('"Seleccionar todas" when choosing the policies to analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(policiesApi.listPolicies).mockResolvedValue(policies);
    vi.mocked(policySetsApi.listPolicySets).mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 100 } as never);
    vi.mocked(policySelectionApi.getPolicySelection).mockRejectedValue(notFound());
    vi.mocked(policySelectionApi.createPolicySelection).mockResolvedValue({} as never);
  });

  function renderView() {
    return render(
      withClient(
        <MemoryRouter initialEntries={[`/repositories/${REPO_ID}/policy-selection`]}>
          <Routes>
            <Route path="/repositories/:repoId/policy-selection" element={<PolicySelectionView />} />
          </Routes>
        </MemoryRouter>,
      ),
    );
  }

  it('selects and clears every policy, and the summary follows', async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(await screen.findByLabelText('Seleccionar todas (3)'));

    expect(policyCheckbox('Consultas parametrizadas').checked).toBe(true);
    expect(policyCheckbox('Codificación de salida HTML').checked).toBe(true);
    expect(policyCheckbox('Control de acceso a datos por rol').checked).toBe(true);
    expect(screen.getByText('políticas seleccionadas').previousElementSibling).toHaveTextContent('3');

    await user.click(screen.getByLabelText('Seleccionar todas (3)'));

    expect(policyCheckbox('Consultas parametrizadas').checked).toBe(false);
    expect(screen.getByText('políticas seleccionadas').previousElementSibling).toHaveTextContent('0');
  });

  it('only selects the filtered policies and saves exactly that selection', async () => {
    const user = userEvent.setup();
    renderView();
    await screen.findByLabelText('Seleccionar todas (3)');

    await user.selectOptions(screen.getByLabelText('Filtrar por framework'), Framework.ISO_27001);
    await user.click(screen.getByLabelText('Seleccionar las 1 política filtrada'));
    await user.selectOptions(screen.getByLabelText('Filtrar por framework'), 'ALL');

    expect(policyCheckbox('Control de acceso a datos por rol').checked).toBe(true);
    expect(policyCheckbox('Consultas parametrizadas').checked).toBe(false);
    expect((screen.getByLabelText('Seleccionar todas (3)') as HTMLInputElement).indeterminate).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Guardar selección' }));

    await waitFor(() =>
      expect(policySelectionApi.createPolicySelection).toHaveBeenCalledWith(REPO_ID, {
        policyIds: ['iso-1'],
        policySetId: null,
      }),
    );
  });
});

describe('"Seleccionar todas" when creating a Policy Set', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(policiesApi.listPolicies).mockResolvedValue(policies);
    vi.mocked(policySetsApi.createPolicySet).mockResolvedValue({ id: 'ps-1' } as never);
  });

  it('adds every active policy to the new set', async () => {
    const user = userEvent.setup();
    render(withClient(<PolicySetCreateForm onSuccess={vi.fn()} />));

    await user.type(await screen.findByLabelText(/^nombre/i), 'Todas las políticas');
    await user.type(screen.getByLabelText(/descripción/i), 'Conjunto con todas las políticas activas del banco');
    await user.click(await screen.findByLabelText('Seleccionar todas (3)'));
    expect(screen.getByText('3 seleccionadas')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /crear policy set/i }));

    await waitFor(() =>
      expect(policySetsApi.createPolicySet).toHaveBeenCalledWith(
        expect.objectContaining({ policyIds: ['owasp-1', 'owasp-2', 'iso-1'] }),
      ),
    );
  });
});
