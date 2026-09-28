import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import DashboardPage from '@/pages/DashboardPage';
import PolicySelectionView from '@/components/repositories/PolicySelectionView';
import type { PolicyPage } from '@/types/policy';
import type { PolicySetResponse } from '@/types/policySet';
import { Category, Framework } from '@/types/enums';

vi.mock('@/api/repositories', () => ({
  uploadZip: vi.fn(),
  cloneGit: vi.fn(),
}));
vi.mock('@/api/policies', () => ({
  listPolicies: vi.fn(),
}));
vi.mock('@/api/policySets', () => ({
  listPolicySets: vi.fn(),
  createPolicySet: vi.fn(),
}));
vi.mock('@/api/policySelection', () => ({
  getPolicySelection: vi.fn(),
  createPolicySelection: vi.fn(),
  updatePolicySelection: vi.fn(),
  applyPolicySet: vi.fn(),
}));

import * as repositoriesApi from '@/api/repositories';
import * as policiesApi from '@/api/policies';
import * as policySetsApi from '@/api/policySets';
import * as policySelectionApi from '@/api/policySelection';

const REPO_ID = 'c1111111-1111-1111-1111-111111111111';

function stubPolicy(id: string, name: string, framework: Framework, category: Category) {
  return {
    id, name, description: '', category, framework, controlId: 'X',
    status: 'ACTIVE' as const, version: 1, weight: 80,
    createdAt: '2026-08-01T00:00:00Z', createdById: null,
    executable: true, rulesCount: 1,
  };
}

const policies: PolicyPage = {
  content: [
    stubPolicy('owasp-1', 'Prevención de SQL Injection con consultas parametrizadas', Framework.OWASP_TOP_10_2021, Category.SQL_INJECTION),
    stubPolicy('iso-1', 'Control de acceso a datos por rol', Framework.ISO_27001, Category.SQL_INJECTION),
    stubPolicy('custom-1', 'Política interna del equipo', Framework.CUSTOM, Category.XSS),
  ],
  totalElements: 3,
  totalPages: 1,
  number: 0,
  size: 100,
  first: true,
  last: true,
};

const perfilPdgIcesi: PolicySetResponse = {
  id: 'ps-1',
  name: 'Perfil PDG ICESI',
  description: 'Conjunto base para validación de proyectos de grado',
  status: 'ACTIVE',
  version: 1,
  policyIds: ['owasp-1', 'custom-1'], // deliberately mixes two different frameworks
  policyNames: ['Prevención de SQL Injection con consultas parametrizadas', 'Política interna del equipo'],
  createdAt: '2026-09-01T00:00:00Z',
  createdById: 'u1',
  updatedAt: '2026-09-01T00:00:00Z',
};

const appliedFromPerfilPdgIcesi = {
  id: 'sel-1',
  repositoryId: REPO_ID,
  selectedPolicies: [
    { id: 'owasp-1', name: 'Prevención de SQL Injection con consultas parametrizadas', framework: Framework.OWASP_TOP_10_2021, controlId: 'X', category: Category.SQL_INJECTION, rulesCount: 1 },
    { id: 'custom-1', name: 'Política interna del equipo', framework: Framework.CUSTOM, controlId: 'X', category: Category.XSS, rulesCount: 1 },
  ],
  categoryCoverage: {} as Record<Category, number>,
  uncoveredCategories: [],
  version: 1,
  policySetId: 'ps-1',
  policySetName: 'Perfil PDG ICESI',
  source: 'POLICY_SET:ps-1:1',
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

describe('Policy Set is actually usable from the analysis flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(policiesApi.listPolicies).mockResolvedValue(policies);
    vi.mocked(policySetsApi.listPolicySets).mockResolvedValue({
      content: [perfilPdgIcesi], page: 0, size: 100, totalElements: 1, totalPages: 1, message: null,
    });
    vi.mocked(repositoriesApi.uploadZip).mockResolvedValue({
      id: REPO_ID,
      status: 'READY_FOR_ANALYSIS',
      sourceType: 'ZIP',
      originalName: 'demo.zip',
      gitUrl: null,
      branch: null,
      fileCount: 3,
      errorMessage: null,
      createdAt: '2026-09-14T00:00:00Z',
      expiresAt: '2026-09-15T00:00:00Z',
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

  it('a Policy Set gets its own named card on the Dashboard (not just a generic "Personalizado" framework card)', async () => {
    renderApp();
    await waitFor(() => {
      expect(screen.getByText(/^Policy Sets/)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Perfil PDG ICESI/i })).toBeInTheDocument();
  });

  it('clicking the Policy Set card, then uploading, previews its policies (dynamically checked in the table too) and applies them via the dedicated action', async () => {
    const user = userEvent.setup();
    vi.mocked(policySelectionApi.applyPolicySet).mockResolvedValue(appliedFromPerfilPdgIcesi);
    renderApp();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Perfil PDG ICESI/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /Perfil PDG ICESI/i }));
    expect(screen.getByText(/Policy Set preseleccionado:/i)).toBeInTheDocument();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['contenido'], 'proyecto.zip', { type: 'application/zip' });
    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: /subir y continuar/i }));

    await waitFor(() => {
      expect(screen.getByText('Selección de políticas')).toBeInTheDocument();
    });

    // Preview shown first -- nothing is persisted yet (still just a
    // preview), but the table below must already reflect the set's
    // composition dynamically, not show everything unchecked.
    await waitFor(() => {
      expect(screen.getByText(/Incluye 2 políticas:/i)).toBeInTheDocument();
    });
    const owaspCheckboxBeforeApply = screen.getByRole('checkbox', {
      name: /Prevención de SQL Injection con consultas parametrizadas/i,
    }) as HTMLInputElement;
    const isoCheckboxBeforeApply = screen.getByRole('checkbox', {
      name: /Control de acceso a datos por rol/i,
    }) as HTMLInputElement;
    expect(owaspCheckboxBeforeApply.checked).toBe(true);
    expect(isoCheckboxBeforeApply.checked).toBe(false); // not in this set

    vi.mocked(policySelectionApi.getPolicySelection).mockResolvedValueOnce(appliedFromPerfilPdgIcesi);
    await user.click(screen.getByRole('button', { name: /aplicar este policy set/i }));

    await waitFor(() => {
      expect(policySelectionApi.applyPolicySet).toHaveBeenCalledWith(REPO_ID, { policySetId: 'ps-1' });
    });
    await waitFor(() => {
      expect(screen.getByText(/Aplicado desde: Perfil PDG ICESI/i)).toBeInTheDocument();
    });

    const owaspCheckbox = screen.getByRole('checkbox', {
      name: /Prevención de SQL Injection con consultas parametrizadas/i,
    }) as HTMLInputElement;
    const customCheckbox = screen.getByRole('checkbox', { name: /Política interna del equipo/i }) as HTMLInputElement;
    const isoCheckbox = screen.getByRole('checkbox', { name: /Control de acceso a datos por rol/i }) as HTMLInputElement;

    expect(owaspCheckbox.checked).toBe(true);
    expect(customCheckbox.checked).toBe(true);
    expect(isoCheckbox.checked).toBe(false); // not in the set
  });

  it('the Policy Set can also be applied directly from the selection screen, without going back to the Dashboard', async () => {
    const user = userEvent.setup();
    vi.mocked(policySelectionApi.applyPolicySet).mockResolvedValue(appliedFromPerfilPdgIcesi);
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={[`/repositories/${REPO_ID}/policy-selection`]}>
          <Routes>
            <Route path="/repositories/:repoId/policy-selection" element={<PolicySelectionView />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const applySelect = await screen.findByLabelText(/elegir un policy set para aplicar/i);
    await user.selectOptions(applySelect, 'ps-1');
    expect(await screen.findByText(/Incluye 2 políticas:/i)).toBeInTheDocument();

    // Picking it from the dropdown already checks its policies in the table
    // below (dynamic preview), before the "Aplicar" click does anything.
    expect((screen.getByRole('checkbox', {
      name: /Prevención de SQL Injection con consultas parametrizadas/i,
    }) as HTMLInputElement).checked).toBe(true);

    vi.mocked(policySelectionApi.getPolicySelection).mockResolvedValueOnce(appliedFromPerfilPdgIcesi);
    await user.click(screen.getByRole('button', { name: /aplicar este policy set/i }));

    await waitFor(() => {
      expect(screen.getByText(/Aplicado desde: Perfil PDG ICESI/i)).toBeInTheDocument();
    });
    const owaspCheckbox = screen.getByRole('checkbox', {
      name: /Prevención de SQL Injection con consultas parametrizadas/i,
    }) as HTMLInputElement;
    expect(owaspCheckbox.checked).toBe(true);
  });

  it('manually adjusting policies after applying a Policy Set, then saving, drops the "aplicado desde" link', async () => {
    const user = userEvent.setup();
    vi.mocked(policySelectionApi.applyPolicySet).mockResolvedValue(appliedFromPerfilPdgIcesi);
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={[`/repositories/${REPO_ID}/policy-selection`]}>
          <Routes>
            <Route path="/repositories/:repoId/policy-selection" element={<PolicySelectionView />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const applySelect = await screen.findByLabelText(/elegir un policy set para aplicar/i);
    await user.selectOptions(applySelect, 'ps-1');
    vi.mocked(policySelectionApi.getPolicySelection).mockResolvedValueOnce(appliedFromPerfilPdgIcesi);
    await user.click(screen.getByRole('button', { name: /aplicar este policy set/i }));
    await waitFor(() => expect(screen.getByText(/Aplicado desde: Perfil PDG ICESI/i)).toBeInTheDocument());

    await user.click(screen.getByRole('checkbox', { name: /Control de acceso a datos por rol/i }));

    // The badge is server-driven: it only changes once the manual edit is
    // actually saved (matching the backend, which derives the
    // MANUAL_ADJUSTMENT source from the previous one at save time).
    expect(screen.getByText(/Aplicado desde:/i)).toBeInTheDocument();

    vi.mocked(policySelectionApi.updatePolicySelection).mockResolvedValueOnce({
      ...appliedFromPerfilPdgIcesi,
      policySetId: null,
      policySetName: null,
      source: 'MANUAL_ADJUSTMENT (from POLICY_SET:ps-1:1)',
    });
    vi.mocked(policySelectionApi.getPolicySelection).mockResolvedValueOnce({
      ...appliedFromPerfilPdgIcesi,
      policySetId: null,
      policySetName: null,
      source: 'MANUAL_ADJUSTMENT (from POLICY_SET:ps-1:1)',
    });
    await user.click(screen.getByRole('button', { name: /guardar selección/i }));

    await waitFor(() => {
      expect(policySelectionApi.updatePolicySelection).toHaveBeenCalledWith(
        REPO_ID,
        expect.objectContaining({ policySetId: null }),
      );
    });
    await waitFor(() => expect(screen.queryByText(/Aplicado desde:/i)).not.toBeInTheDocument());
  });

  it('diverging from an applied Policy Set offers to save the variant as a new one, which then gets applied', async () => {
    const user = userEvent.setup();
    vi.mocked(policySelectionApi.applyPolicySet).mockResolvedValue(appliedFromPerfilPdgIcesi);
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={[`/repositories/${REPO_ID}/policy-selection`]}>
          <Routes>
            <Route path="/repositories/:repoId/policy-selection" element={<PolicySelectionView />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const applySelect = await screen.findByLabelText(/elegir un policy set para aplicar/i);
    await user.selectOptions(applySelect, 'ps-1');
    vi.mocked(policySelectionApi.getPolicySelection).mockResolvedValueOnce(appliedFromPerfilPdgIcesi);
    await user.click(screen.getByRole('button', { name: /aplicar este policy set/i }));
    await waitFor(() => expect(screen.getByText(/Aplicado desde: Perfil PDG ICESI/i)).toBeInTheDocument());

    // No divergence banner yet -- the applied set's composition matches exactly.
    expect(screen.queryByText(/ya no coincide exactamente/i)).not.toBeInTheDocument();

    // Add a policy that isn't part of "Perfil PDG ICESI" -- now it diverges.
    await user.click(screen.getByRole('checkbox', { name: /Control de acceso a datos por rol/i }));
    expect(await screen.findByText(/ya no coincide exactamente/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /guardar como nuevo policy set/i }));
    const nameInput = screen.getByLabelText(/nombre del nuevo policy set/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Perfil PDG ICESI (variante)');

    await user.clear(nameInput);
    await user.type(nameInput, 'Mi variante');

    const newSet: PolicySetResponse = {
      id: 'ps-2',
      name: 'Mi variante',
      description: null,
      status: 'ACTIVE',
      version: 1,
      policyIds: ['owasp-1', 'custom-1', 'iso-1'],
      policyNames: [
        'Prevención de SQL Injection con consultas parametrizadas',
        'Política interna del equipo',
        'Control de acceso a datos por rol',
      ],
      createdAt: '2026-09-18T00:00:00Z',
      createdById: 'u1',
      updatedAt: '2026-09-18T00:00:00Z',
    };
    vi.mocked(policySetsApi.createPolicySet).mockResolvedValue(newSet);
    vi.mocked(policySelectionApi.applyPolicySet).mockResolvedValueOnce({
      ...appliedFromPerfilPdgIcesi,
      policySetId: 'ps-2',
      policySetName: 'Mi variante',
      source: 'POLICY_SET:ps-2:1',
    });
    vi.mocked(policySelectionApi.getPolicySelection).mockResolvedValueOnce({
      ...appliedFromPerfilPdgIcesi,
      policySetId: 'ps-2',
      policySetName: 'Mi variante',
      source: 'POLICY_SET:ps-2:1',
    });

    await user.click(screen.getByRole('button', { name: /^crear$/i }));

    await waitFor(() => {
      expect(policySetsApi.createPolicySet).toHaveBeenCalledWith({
        name: 'Mi variante',
        policyIds: expect.arrayContaining(['owasp-1', 'custom-1', 'iso-1']),
      });
    });
    await waitFor(() => {
      expect(policySelectionApi.applyPolicySet).toHaveBeenCalledWith(REPO_ID, { policySetId: 'ps-2' });
    });
    await waitFor(() => {
      expect(screen.getByText(/Policy Set "Mi variante" creado y aplicado\./i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/ya no coincide exactamente/i)).not.toBeInTheDocument();
  });

  it('unchecking a policy from a Policy Set preview -- before ever clicking "Aplicar" -- still warns about the divergence', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={[`/repositories/${REPO_ID}/policy-selection`]}>
          <Routes>
            <Route path="/repositories/:repoId/policy-selection" element={<PolicySelectionView />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // No selection exists at all yet -- getPolicySelection stays 404'd for
    // this whole test, matching "acabo de subir el código y aún no aplico ni
    // guardo nada".
    const applySelect = await screen.findByLabelText(/elegir un policy set para aplicar/i);
    await user.selectOptions(applySelect, 'ps-1');
    expect(await screen.findByText(/Incluye 2 políticas:/i)).toBeInTheDocument();
    expect(screen.queryByText(/ya no coincide exactamente/i)).not.toBeInTheDocument();

    // Uncheck one of the set's own policies, without ever clicking "Aplicar
    // este Policy Set" -- this is the exact flow that was reported as
    // "no aparece ningún aviso".
    await user.click(screen.getByRole('checkbox', {
      name: /Prevención de SQL Injection con consultas parametrizadas/i,
    }));

    expect(await screen.findByText(/ya no coincide exactamente/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar como nuevo policy set/i })).toBeInTheDocument();
  });
});
