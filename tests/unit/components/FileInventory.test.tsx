import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FileInventory from '@/components/repositories/FileInventory';
import type { FileInventoryResponse } from '@/types/repository';

vi.mock('@/api/repositoryFiles', () => ({
  getRepositoryFiles: vi.fn(),
}));

import * as api from '@/api/repositoryFiles';

const REPO_ID = 'repo-123';

const makeInventory = (overrides: Partial<FileInventoryResponse> = {}): FileInventoryResponse => ({
  repositoryId: REPO_ID,
  inventoryStatus: 'READY_FOR_ANALYSIS',
  totalFiles: 3,
  excludedCount: 2,
  byLanguage: { java: 2, xml: 1 },
  byArtifactType: { SOURCE_CODE: 2, DEPENDENCY_MANIFEST: 1 },
  page: 0,
  size: 20,
  totalElements: 3,
  totalPages: 1,
  files: [
    {
      id: '1',
      path: 'src/Main.java',
      language: 'java',
      artifactType: 'SOURCE_CODE',
      sizeBytes: 1024,
      sha256: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
    },
    {
      id: '2',
      path: 'src/Service.java',
      language: 'java',
      artifactType: 'SOURCE_CODE',
      sizeBytes: 2048,
      sha256: 'def456abc123def456abc123def456abc123def456abc123def456abc123def4',
    },
    {
      id: '3',
      path: 'pom.xml',
      language: 'xml',
      artifactType: 'DEPENDENCY_MANIFEST',
      sizeBytes: 512,
      sha256: 'ghi789ghi789ghi789ghi789ghi789ghi789ghi789ghi789ghi789ghi789ghi7',
    },
  ],
  ...overrides,
});

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('FileInventory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    vi.mocked(api.getRepositoryFiles).mockReturnValue(new Promise(() => {}));
    renderWithQuery(<FileInventory repositoryId={REPO_ID} />);
    expect(screen.getByRole('status')).toHaveTextContent(/cargando/i);
  });

  it('renders file table when inventory is ready', async () => {
    vi.mocked(api.getRepositoryFiles).mockResolvedValue({
      data: makeInventory(),
      status: 200,
    });

    renderWithQuery(<FileInventory repositoryId={REPO_ID} />);

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    expect(screen.getByText('src/Main.java')).toBeInTheDocument();
    expect(screen.getByText('src/Service.java')).toBeInTheDocument();
    expect(screen.getByText('pom.xml')).toBeInTheDocument();
  });

  it('shows total file count in summary', async () => {
    vi.mocked(api.getRepositoryFiles).mockResolvedValue({
      data: makeInventory(),
      status: 200,
    });

    renderWithQuery(<FileInventory repositoryId={REPO_ID} />);

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('shows in-progress banner when inventorying (202)', async () => {
    vi.mocked(api.getRepositoryFiles).mockResolvedValue({
      data: makeInventory({ inventoryStatus: 'INVENTORYING', files: [], totalFiles: 0 }),
      status: 202,
    });

    renderWithQuery(<FileInventory repositoryId={REPO_ID} />);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/en progreso/i);
    });
  });

  it('shows error alert when inventory failed', async () => {
    vi.mocked(api.getRepositoryFiles).mockResolvedValue({
      data: makeInventory({ inventoryStatus: 'FAILED', files: [] }),
      status: 200,
    });

    renderWithQuery(<FileInventory repositoryId={REPO_ID} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('renders language badges and clicking filters by language', async () => {
    vi.mocked(api.getRepositoryFiles).mockResolvedValue({
      data: makeInventory(),
      status: 200,
    });

    renderWithQuery(<FileInventory repositoryId={REPO_ID} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /java/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /java/i }));

    await waitFor(() => {
      expect(api.getRepositoryFiles).toHaveBeenCalledWith(
        REPO_ID,
        expect.objectContaining({ language: 'java' }),
      );
    });
  });

  it('filters by artifact type via select', async () => {
    vi.mocked(api.getRepositoryFiles).mockResolvedValue({
      data: makeInventory(),
      status: 200,
    });

    renderWithQuery(<FileInventory repositoryId={REPO_ID} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/tipo de artefacto/i)).toBeInTheDocument();
    });

    await userEvent.selectOptions(
      screen.getByLabelText(/tipo de artefacto/i),
      'DEPENDENCY_MANIFEST',
    );

    await waitFor(() => {
      expect(api.getRepositoryFiles).toHaveBeenCalledWith(
        REPO_ID,
        expect.objectContaining({ artifactType: 'DEPENDENCY_MANIFEST' }),
      );
    });
  });

  it('shows empty message when no files match filters', async () => {
    vi.mocked(api.getRepositoryFiles).mockResolvedValue({
      data: makeInventory({ files: [], totalElements: 0 }),
      status: 200,
    });

    renderWithQuery(<FileInventory repositoryId={REPO_ID} />);

    await waitFor(() => {
      expect(screen.getByText(/no se encontraron archivos/i)).toBeInTheDocument();
    });
  });

  it('each file row has path, language, artifact type, size and sha256', async () => {
    vi.mocked(api.getRepositoryFiles).mockResolvedValue({
      data: makeInventory(),
      status: 200,
    });

    renderWithQuery(<FileInventory repositoryId={REPO_ID} />);

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    const rows = screen.getAllByRole('row');
    const dataRow = rows[1];
    expect(within(dataRow).getByText('src/Main.java')).toBeInTheDocument();
    expect(within(dataRow).getByText('java')).toBeInTheDocument();
    expect(within(dataRow).getByText('Código fuente')).toBeInTheDocument();
    expect(within(dataRow).getByText('1.0 KB')).toBeInTheDocument();
  });

  it('clear filters button appears and resets filters', async () => {
    vi.mocked(api.getRepositoryFiles).mockResolvedValue({
      data: makeInventory(),
      status: 200,
    });

    renderWithQuery(<FileInventory repositoryId={REPO_ID} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/lenguaje/i)).toBeInTheDocument();
    });

    await userEvent.type(screen.getByLabelText(/filtrar por lenguaje/i), 'java');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /limpiar filtros/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /limpiar filtros/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /limpiar filtros/i })).not.toBeInTheDocument();
    });
  });

  it('shows pagination when more than one page', async () => {
    vi.mocked(api.getRepositoryFiles).mockResolvedValue({
      data: makeInventory({ totalPages: 3, totalElements: 60 }),
      status: 200,
    });

    renderWithQuery(<FileInventory repositoryId={REPO_ID} />);

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: /paginación/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /página siguiente/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /página anterior/i })).toBeDisabled();
  });
});
