import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PolicyListPage from '@/components/policies/PolicyListPage';
import PolicyDetailPage from '@/components/policies/PolicyDetailPage';
import type { PolicyPage, PolicyResponse } from '@/types/policy';

vi.mock('@/api/policies', () => ({
  listPolicies: vi.fn(),
  getPolicyById: vi.fn(),
  updatePolicy: vi.fn(),
  archivePolicy: vi.fn(),
  restorePolicy: vi.fn(),
  getPolicyAuditLog: vi.fn().mockResolvedValue([]),
  createPolicy: vi.fn(),
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

const POLICY_ID = 'asda-id';

const activePolicy: PolicyResponse = {
  id: POLICY_ID,
  name: 'asda',
  description: 'Descripción con la longitud mínima requerida.',
  category: 'SQL_INJECTION',
  framework: 'ISO_27001',
  controlId: null,
  status: 'ACTIVE',
  version: 1,
  weight: 50,
  applicability: {},
  createdAt: '2026-08-01T00:00:00Z',
  createdById: 'u1',
  executable: false,
  rulesCount: 0,
};

function activeListPage(): PolicyPage {
  return {
    content: [activePolicy],
    totalElements: 1,
    totalPages: 1,
    number: 0,
    size: 10,
    first: true,
    last: true,
  };
}

function emptyListPage(): PolicyPage {
  return { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10, first: true, last: true };
}

function App() {
  return (
    <MemoryRouter initialEntries={['/policies']}>
      <Routes>
        <Route path="/policies" element={<PolicyListPage />} />
        <Route path="/policies/:id" element={<PolicyDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('policy list reactivity after archiving from the detail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('the list no longer shows the policy as Activa after it was archived elsewhere, on remount', async () => {
    const user = userEvent.setup();
    // One shared QueryClient across the whole test, exactly like main.tsx.
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    vi.mocked(policiesApi.listPolicies).mockResolvedValueOnce(activeListPage());
    vi.mocked(policiesApi.getPolicyById).mockResolvedValue(activePolicy);
    vi.mocked(policiesApi.archivePolicy).mockResolvedValue(undefined);
    // After archiving, a fresh listPolicies() call (default filters = ACTIVE only) excludes it.
    vi.mocked(policiesApi.listPolicies).mockResolvedValue(emptyListPage());

    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    );

    // 1. List shows it as Activa.
    await waitFor(() => {
      expect(screen.getByText('asda')).toBeInTheDocument();
    });
    expect(screen.getByRole('status', { name: /estado: activa/i })).toBeInTheDocument();

    // 2. Navigate into the policy (unmounts PolicyListPage).
    await user.click(screen.getByRole('button', { name: 'asda' }));
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /volver al banco de políticas/i })).toBeInTheDocument();
    });

    // 3. Archive it from the detail page.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^archivar$/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /^archivar$/i }));
    const dialog = await screen.findByRole('alertdialog');
    const confirmBtn = (await screen.findAllByRole('button', { name: /^archivar$/i })).find((b) => dialog.contains(b))!;
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(policiesApi.archivePolicy).toHaveBeenCalledWith(POLICY_ID);
    });

    // 4. Navigate back to the list (remounts PolicyListPage -> fresh usePolicies mount).
    await user.click(screen.getByRole('link', { name: /volver al banco de políticas/i }));

    // BUG UNDER TEST: does the list actually refetch and stop showing "asda" as Activa?
    await waitFor(() => {
      expect(screen.queryByText('asda')).not.toBeInTheDocument();
    });
  });
});
