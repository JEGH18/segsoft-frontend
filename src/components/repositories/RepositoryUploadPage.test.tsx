import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import RepositoryUploadPage from './RepositoryUploadPage';
import * as api from '@/api/repositories';
import type { RepositoryResponse } from '@/types/repository';

vi.mock('@/api/repositories');

const mockZipRepo: RepositoryResponse = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  status: 'READY_FOR_ANALYSIS',
  sourceType: 'ZIP',
  originalName: 'test.zip',
  gitUrl: null,
  branch: null,
  fileCount: 42,
  errorMessage: null,
  createdAt: '2026-05-22T10:00:00Z',
  expiresAt: '2026-05-23T10:00:00Z',
};

const mockGitRepo: RepositoryResponse = {
  id: '456e7890-e89b-12d3-a456-426614174000',
  status: 'READY_FOR_ANALYSIS',
  sourceType: 'GIT',
  originalName: 'my-repo',
  gitUrl: 'https://github.com/user/my-repo.git',
  branch: 'main',
  fileCount: 10,
  errorMessage: null,
  createdAt: '2026-05-22T10:00:00Z',
  expiresAt: '2026-05-23T10:00:00Z',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <RepositoryUploadPage />
    </MemoryRouter>
  );
}

describe('RepositoryUploadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with ZIP mode selected by default', () => {
    renderPage();
    expect(screen.getByText('Archivo ZIP')).toBeInTheDocument();
    expect(screen.getByText('URL Git')).toBeInTheDocument();
    expect(screen.getByText(/arrastra tu zip/i)).toBeInTheDocument();
  });

  it('shows dropzone and submit button in ZIP mode', () => {
    renderPage();
    expect(screen.getByText(/máximo 100 mb/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /subir repositorio/i })).toBeInTheDocument();
  });

  it('switches to Git mode and shows URL + branch inputs', async () => {
    renderPage();
    await userEvent.click(screen.getByText('URL Git'));

    expect(screen.getByPlaceholderText(/github\.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('main')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clonar repositorio/i })).toBeInTheDocument();
    expect(screen.queryByText(/arrastra tu zip/i)).not.toBeInTheDocument();
  });

  it('shows error when submitting ZIP without a file', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /subir repositorio/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/selecciona un archivo zip/i);
    expect(api.uploadZip).not.toHaveBeenCalled();
  });

  it('shows error when submitting Git mode without URL', async () => {
    renderPage();
    await userEvent.click(screen.getByText('URL Git'));
    const submitBtn = await screen.findByRole('button', { name: /clonar repositorio/i });
    await userEvent.click(submitBtn);

    expect(screen.getByRole('alert')).toHaveTextContent(/ingresa la url/i);
    expect(api.cloneGit).not.toHaveBeenCalled();
  });

  it('shows error when selected file exceeds 100 MB', async () => {
    renderPage();
    const oversizedFile = new File([new ArrayBuffer(101 * 1024 * 1024)], 'big.zip', {
      type: 'application/zip',
    });
    Object.defineProperty(oversizedFile, 'size', { value: 101 * 1024 * 1024 });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, oversizedFile);
    await userEvent.click(screen.getByRole('button', { name: /subir repositorio/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/supera el límite/i);
    expect(api.uploadZip).not.toHaveBeenCalled();
  });

  it('calls uploadZip and shows result card on success', async () => {
    vi.mocked(api.uploadZip).mockResolvedValue(mockZipRepo);
    renderPage();

    const file = new File(['content'], 'test.zip', { type: 'application/zip' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);
    await userEvent.click(screen.getByRole('button', { name: /subir repositorio/i }));

    await waitFor(() => {
      expect(screen.getByText('test.zip')).toBeInTheDocument();
      expect(screen.getByText('Listo para analizar')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    expect(api.uploadZip).toHaveBeenCalledWith(file);
  });

  it('calls cloneGit with URL and branch and shows result card on success', async () => {
    vi.mocked(api.cloneGit).mockResolvedValue(mockGitRepo);
    renderPage();

    await userEvent.click(screen.getByText('URL Git'));
    await userEvent.type(
      screen.getByPlaceholderText(/github\.com/i),
      'https://github.com/user/my-repo.git',
    );

    const branchInput = screen.getByPlaceholderText('main');
    await userEvent.clear(branchInput);
    await userEvent.type(branchInput, 'develop');

    await userEvent.click(screen.getByRole('button', { name: /clonar repositorio/i }));

    await waitFor(() => {
      expect(screen.getByText('my-repo')).toBeInTheDocument();
      expect(screen.getByText('Listo para analizar')).toBeInTheDocument();
    });

    expect(api.cloneGit).toHaveBeenCalledWith({
      gitUrl: 'https://github.com/user/my-repo.git',
      branch: 'develop',
    });
  });

  it('shows API error message when upload fails', async () => {
    vi.mocked(api.uploadZip).mockRejectedValue({
      response: { data: { message: 'ZIP bomb detectada' } },
    });
    renderPage();

    const file = new File(['content'], 'bomb.zip', { type: 'application/zip' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);
    await userEvent.click(screen.getByRole('button', { name: /subir repositorio/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('ZIP bomb detectada');
    });
  });

  it('resets to upload form when clicking Nuevo in result card', async () => {
    vi.mocked(api.uploadZip).mockResolvedValue(mockZipRepo);
    renderPage();

    const file = new File(['content'], 'test.zip', { type: 'application/zip' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);
    await userEvent.click(screen.getByRole('button', { name: /subir repositorio/i }));

    await waitFor(() => screen.getByText('Nuevo'));
    await userEvent.click(screen.getByText('Nuevo'));

    expect(screen.getByText(/arrastra tu zip/i)).toBeInTheDocument();
    expect(screen.queryByText('test.zip')).not.toBeInTheDocument();
  });

  it('shows FAILED status correctly in result card', async () => {
    const failedRepo: RepositoryResponse = {
      ...mockZipRepo,
      status: 'FAILED',
      errorMessage: 'Dominio Git no permitido',
    };
    vi.mocked(api.uploadZip).mockResolvedValue(failedRepo);
    renderPage();

    const file = new File(['content'], 'test.zip', { type: 'application/zip' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);
    await userEvent.click(screen.getByRole('button', { name: /subir repositorio/i }));

    await waitFor(() => {
      expect(screen.getByText('Dominio Git no permitido')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Error').length).toBeGreaterThanOrEqual(1);
  });
});
