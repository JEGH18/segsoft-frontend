import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PolicyDetailPage from '@/components/policies/PolicyDetailPage';
import type { PolicyResponse } from '@/types/policy';

vi.mock('@/api/policies', () => ({
  getPolicyById: vi.fn(),
  updatePolicy: vi.fn(),
  archivePolicy: vi.fn(),
  restorePolicy: vi.fn(),
  getPolicyAuditLog: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/api/rules', () => ({
  listRules: vi.fn().mockResolvedValue({ content: [], totalElements: 0, totalPages: 0 }),
  createRule: vi.fn(),
  archiveRule: vi.fn(),
}));
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

import * as policiesApi from '@/api/policies';

const POLICY_ID = 'p-1111-1111';

const activePolicy: PolicyResponse = {
  id: POLICY_ID,
  name: 'Prevención de SQL Injection',
  description: 'Descripción original con la longitud mínima requerida.',
  category: 'SQL_INJECTION',
  framework: 'OWASP_TOP_10_2021',
  controlId: 'A03:2021',
  status: 'ACTIVE',
  version: 3,
  weight: 80,
  applicability: {},
  createdAt: '2026-08-01T00:00:00Z',
  createdById: 'u1',
  executable: true,
  rulesCount: 1,
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/policies/${POLICY_ID}`]}>
        <Routes>
          <Route path="/policies/:id" element={<PolicyDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PolicyDetailPage lifecycle UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(policiesApi.getPolicyById).mockResolvedValue(activePolicy);
  });

  it('shows framework/control/category as disabled with a tooltip, and description/weight as editable', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue('OWASP Top 10 2021')).toBeInTheDocument();
    });

    const frameworkInput = screen.getByLabelText('Marco normativo') as HTMLInputElement;
    expect(frameworkInput.disabled).toBe(true);
    expect(frameworkInput.title).toMatch(/no editable/i);

    const descriptionInput = screen.getByLabelText('Descripción') as HTMLTextAreaElement;
    expect(descriptionInput.disabled).toBe(false);
  });

  it('saves an edit with If-Match set to the current version', async () => {
    const user = userEvent.setup();
    vi.mocked(policiesApi.updatePolicy).mockResolvedValue({ ...activePolicy, version: 4, weight: 95 });
    renderPage();

    await waitFor(() => {
      expect(screen.getByLabelText('Peso de criticidad (1-100)')).toBeInTheDocument();
    });

    const weightInput = screen.getByLabelText('Peso de criticidad (1-100)');
    await user.clear(weightInput);
    await user.type(weightInput, '95');

    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(policiesApi.updatePolicy).toHaveBeenCalledWith(
        POLICY_ID,
        expect.objectContaining({ weight: 95 }),
        3, // ifMatchVersion = the version the page loaded
      );
    });
  });

  it('archiving asks for confirmation before calling the API', async () => {
    const user = userEvent.setup();
    vi.mocked(policiesApi.archivePolicy).mockResolvedValue(undefined);
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^archivar$/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^archivar$/i }));

    // Confirmation dialog appears; API must not be called yet.
    const dialog = await screen.findByRole('alertdialog');
    expect(policiesApi.archivePolicy).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: /^archivar$/i }));

    await waitFor(() => {
      expect(policiesApi.archivePolicy).toHaveBeenCalled();
    });
  });

  it('after archiving succeeds, the badge actually updates to Archivada (not stuck on Activa)', async () => {
    const user = userEvent.setup();
    vi.mocked(policiesApi.archivePolicy).mockResolvedValue(undefined);
    // Simulate the real backend: first load returns ACTIVE, the refetch that
    // React Query triggers after invalidateQueries() returns ARCHIVED.
    vi.mocked(policiesApi.getPolicyById)
      .mockResolvedValueOnce(activePolicy)
      .mockResolvedValue({ ...activePolicy, status: 'ARCHIVED', version: 4 });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('status', { name: /estado: activa/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^archivar$/i }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /^archivar$/i }));

    await waitFor(() => {
      expect(screen.getByRole('status', { name: /estado: archivada/i })).toBeInTheDocument();
    });
    // The "Archivar" action button should be gone; "Restaurar" takes its place.
    expect(screen.queryByRole('button', { name: /^archivar$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^restaurar$/i })).toBeInTheDocument();
  });

  it('shows who created/archived/etc the policy, including their user id', async () => {
    vi.mocked(policiesApi.getPolicyAuditLog).mockResolvedValue([
      {
        id: 'audit-2',
        action: 'POLICY_ARCHIVED',
        userId: 'u1',
        username: 'admin',
        timestamp: '2026-08-26T07:36:24.874Z',
        payload: { previousStatus: 'ACTIVE' },
      },
      {
        id: 'audit-1',
        action: 'POLICY_CREATED',
        userId: 'u1',
        username: 'admin',
        timestamp: '2026-08-01T00:00:00Z',
        payload: { name: 'Prevención de SQL Injection' },
      },
    ]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Historial de cambios')).toBeInTheDocument();
    });

    expect(await screen.findByText('Archivada')).toBeInTheDocument();
    expect(screen.getByText('Creada')).toBeInTheDocument();
    // Both the username and their raw id must be visible, not just the name.
    expect(screen.getAllByText('admin')).toHaveLength(2);
    expect(screen.getAllByText('(u1)')).toHaveLength(2);
  });
});
