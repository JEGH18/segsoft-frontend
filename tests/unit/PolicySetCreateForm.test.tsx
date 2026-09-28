import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PolicySetCreateForm from '@/components/policySets/PolicySetCreateForm';
import * as policiesApi from '@/api/policies';
import * as policySetsApi from '@/api/policySets';
import { Category, Framework } from '@/types/enums';
import type { PolicyResponse } from '@/types/policy';

vi.mock('@/api/policies');
vi.mock('@/api/policySets');

const mockCreatePolicySet = vi.mocked(policySetsApi.createPolicySet);
const mockListPolicies = vi.mocked(policiesApi.listPolicies);

function activePolicy(id: string, name: string): PolicyResponse {
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

function renderForm(onSuccess = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PolicySetCreateForm onSuccess={onSuccess} />
    </QueryClientProvider>,
  );
}

describe('PolicySetCreateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPolicies.mockResolvedValue({
      content: [activePolicy('p1', 'Prevención de SQL Injection'), activePolicy('p2', 'Control de acceso a datos por rol')],
      totalElements: 2,
      totalPages: 1,
      number: 0,
      size: 100,
      first: true,
      last: true,
    });
  });

  it('lists the active policies from the bank as checkboxes', async () => {
    renderForm();
    await waitFor(() => {
      expect(screen.getByText('Prevención de SQL Injection')).toBeInTheDocument();
    });
    expect(screen.getByText('Control de acceso a datos por rol')).toBeInTheDocument();
  });

  it('requires a name before submitting', async () => {
    const user = userEvent.setup();
    renderForm();

    await waitFor(() => expect(screen.getByText('Prevención de SQL Injection')).toBeInTheDocument());
    await user.click(screen.getByRole('checkbox', { name: /Prevención de SQL Injection/i }));
    await user.click(screen.getByRole('button', { name: /crear policy set/i }));

    await waitFor(() => {
      expect(screen.getByText(/nombre es obligatorio/i)).toBeInTheDocument();
    });
    expect(mockCreatePolicySet).not.toHaveBeenCalled();
  });

  it('requires at least one policy selected', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/^nombre/i), 'Perfil PDG ICESI');
    await user.click(screen.getByRole('button', { name: /crear policy set/i }));

    await waitFor(() => {
      expect(screen.getByText(/al menos una política/i)).toBeInTheDocument();
    });
    expect(mockCreatePolicySet).not.toHaveBeenCalled();
  });

  it('submits with the selected policyIds and calls onSuccess', async () => {
    const user = userEvent.setup();
    mockCreatePolicySet.mockResolvedValue({
      id: 'ps-1',
      name: 'Perfil PDG ICESI',
      description: 'Conjunto base para validación de proyectos de grado',
      status: 'ACTIVE',
      version: 1,
      policyIds: ['p1', 'p2'],
      policyNames: ['Prevención de SQL Injection', 'Control de acceso a datos por rol'],
      createdAt: '2026-09-14T00:00:00Z',
      createdById: 'u1',
      updatedAt: '2026-09-14T00:00:00Z',
    });
    const onSuccess = vi.fn();
    renderForm(onSuccess);

    await waitFor(() => expect(screen.getByText('Prevención de SQL Injection')).toBeInTheDocument());
    await user.type(screen.getByLabelText(/^nombre/i), 'Perfil PDG ICESI');
    await user.type(screen.getByLabelText(/descripción/i), 'Conjunto base para validación de proyectos de grado');
    await user.click(screen.getByRole('checkbox', { name: /Prevención de SQL Injection/i }));
    await user.click(screen.getByRole('checkbox', { name: /Control de acceso a datos por rol/i }));
    await user.click(screen.getByRole('button', { name: /crear policy set/i }));

    await waitFor(() => {
      expect(mockCreatePolicySet).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Perfil PDG ICESI',
          description: 'Conjunto base para validación de proyectos de grado',
          policyIds: ['p1', 'p2'],
        }),
      );
    });
    expect(onSuccess).toHaveBeenCalledWith('ps-1');
  });

  it('surfaces the backend validation message (e.g. an inactive/nonexistent policy) as a server error', async () => {
    const user = userEvent.setup();
    mockCreatePolicySet.mockRejectedValueOnce({
      response: { data: { message: "La política 'p1' no existe o no está activa" } },
    });
    renderForm();

    await waitFor(() => expect(screen.getByText('Prevención de SQL Injection')).toBeInTheDocument());
    await user.type(screen.getByLabelText(/^nombre/i), 'Set X');
    await user.click(screen.getByRole('checkbox', { name: /Prevención de SQL Injection/i }));
    await user.click(screen.getByRole('button', { name: /crear policy set/i }));

    await waitFor(() => {
      expect(screen.getByText(/no existe o no está activa/i)).toBeInTheDocument();
    });
  });
});
