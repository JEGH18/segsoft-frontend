import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from '@/pages/DashboardPage';

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

import * as repositoriesApi from '@/api/repositories';
import * as policiesApi from '@/api/policies';
import * as policySetsApi from '@/api/policySets';

const P2TOOLS_CLONE_URL = 'https://pi2tools.icesi.edu.co/bitbucket/scm/segsoft/segsoft-backend.git';

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/repositories/:repoId/policy-selection" element={<p>Selección de políticas</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function openGitForm() {
  renderDashboard();
  await userEvent.click(screen.getByRole('button', { name: /url de repositorio git/i }));
}

describe('Dashboard: clone from a Git URL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(policiesApi.listPolicies).mockResolvedValue({
      content: [], totalElements: 0, totalPages: 0, number: 0, size: 100, first: true, last: true,
    });
    vi.mocked(policySetsApi.listPolicySets).mockResolvedValue({
      content: [], page: 0, size: 100, totalElements: 0, totalPages: 0, message: null,
    });
    vi.mocked(repositoriesApi.cloneGit).mockResolvedValue({
      id: 'repo-1',
      status: 'READY_FOR_ANALYSIS',
      sourceType: 'GIT',
      originalName: 'segsoft-backend',
      gitUrl: P2TOOLS_CLONE_URL,
      branch: 'main',
      fileCount: 10,
      errorMessage: null,
      createdAt: '2026-11-09T00:00:00Z',
      expiresAt: '2026-11-10T00:00:00Z',
    });
  });

  it('accepts what Bitbucket\'s Clone button copies and sends the clean clone URL with the token', async () => {
    await openGitForm();
    await userEvent.type(
      screen.getByLabelText(/url del repositorio/i),
      'git clone https://09juanesteban@pi2tools.icesi.edu.co/bitbucket/scm/segsoft/segsoft-backend.git',
    );
    await userEvent.type(screen.getByLabelText(/token de acceso/i), 'BBDC-token');
    await userEvent.click(screen.getByRole('button', { name: /clonar y continuar/i }));

    await waitFor(() => {
      expect(repositoriesApi.cloneGit).toHaveBeenCalledWith({
        gitUrl: P2TOOLS_CLONE_URL,
        branch: 'main',
        accessToken: 'BBDC-token',
      });
    });
    expect(await screen.findByText('Selección de políticas')).toBeInTheDocument();
  });

  it('turns a p2tools repository page address into its clone URL', async () => {
    await openGitForm();
    await userEvent.type(
      screen.getByLabelText(/url del repositorio/i),
      'https://pi2tools.icesi.edu.co/bitbucket/projects/SEGSOFT/repos/segsoft-backend/browse',
    );
    await userEvent.click(screen.getByRole('button', { name: /clonar y continuar/i }));

    await waitFor(() => {
      expect(repositoriesApi.cloneGit).toHaveBeenCalledWith(
        expect.objectContaining({ gitUrl: P2TOOLS_CLONE_URL, accessToken: undefined }),
      );
    });
  });

  it('explains which token to create once the URL is a p2tools one', async () => {
    await openGitForm();
    expect(screen.queryByText(/tokens de acceso http/i)).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/url del repositorio/i), P2TOOLS_CLONE_URL);
    expect(screen.getByText(/p2tools: crea un token http de acceso/i)).toBeInTheDocument();
    expect(screen.getByText(/también sirve la dirección de la página del repositorio/i)).toBeInTheDocument();
  });

  it('shows the Bitbucket Cloud token hint for bitbucket.org and no hint for GitHub', async () => {
    await openGitForm();
    const url = screen.getByLabelText(/url del repositorio/i);

    await userEvent.type(url, 'https://github.com/usuario/repo.git');
    expect(screen.queryByText(/read:repository:bitbucket/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/botón «clone» de bitbucket/i)).not.toBeInTheDocument();

    await userEvent.clear(url);
    await userEvent.type(url, 'https://bitbucket.org/equipo/repo.git');
    expect(screen.getByText(/read:repository:bitbucket/i)).toBeInTheDocument();
  });
});
