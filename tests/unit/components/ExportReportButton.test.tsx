import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import ExportReportButton from '@/components/reports/ExportReportButton';
import { AnalysisStatus } from '@/types/enums';

const auth = vi.hoisted(() => ({ roles: ['AUDITOR'] as string[] }));

vi.mock('@/store/authStore', () => ({
  useAuth: () => ({
    user: { id: 'u1', username: 'auditor', roles: auth.roles },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    setLoading: vi.fn(),
  }),
}));
vi.mock('@/api/reports', () => ({
  generateReport: vi.fn(),
  exportReport: vi.fn(),
}));

import * as reportsApi from '@/api/reports';

const ANALYSIS_ID = 'a1111111-1111-1111-1111-111111111111';
const REPORT_ID = 'r2222222-2222-2222-2222-222222222222';
const CHECKSUM = '46742c18e253c51f1cac5bfecc6e9f04b82b5a11e7874131ab9419ae36042601';

function axiosErrorWithStatus(status: number, data: unknown = {}) {
  return new AxiosError('error', String(status), undefined, undefined, {
    status,
    data,
    statusText: 'error',
    headers: {},
    // @ts-expect-error minimal mock config, not used by the component
    config: {},
  });
}

function renderButton(status: AnalysisStatus = AnalysisStatus.COMPLETED) {
  return render(<ExportReportButton analysisId={ANALYSIS_ID} analysisStatus={status} />);
}

describe('ExportReportButton', () => {
  const createObjectURL = vi.fn(() => 'blob:report');
  const revokeObjectURL = vi.fn();
  let clickSpy: ReturnType<typeof vi.spyOn>;
  let clickedLinks: HTMLAnchorElement[];

  beforeAll(() => {
    // jsdom's Blob lacks text(), which every supported browser has.
    if (!Blob.prototype.text) {
      Blob.prototype.text = function text(this: Blob) {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsText(this);
        });
      };
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    auth.roles = ['AUDITOR'];
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    clickedLinks = [];
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clickedLinks.push(this);
    });
    vi.mocked(reportsApi.generateReport).mockResolvedValue({
      id: REPORT_ID,
      analysisId: ANALYSIS_ID,
      status: 'GENERATED',
      checksum: CHECKSUM,
      generatedAt: '2026-09-28T01:54:48.988-05:00',
    });
    vi.mocked(reportsApi.exportReport).mockResolvedValue({
      blob: new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
      fileName: `segsoft-report-${REPORT_ID}.pdf`,
    });
  });

  afterEach(() => {
    clickSpy.mockRestore();
  });

  it.each([['AUDITOR'], ['SECURITY_ADMIN']])('is shown to %s', (role) => {
    auth.roles = [role];
    renderButton();
    expect(screen.getByRole('button', { name: /Exportar PDF/i })).toBeEnabled();
  });

  it('is not rendered for a DEVELOPER, whom the backend would reject', () => {
    auth.roles = ['DEVELOPER'];
    renderButton();
    expect(screen.queryByRole('button', { name: /Exportar PDF/i })).not.toBeInTheDocument();
  });

  it('is disabled while the analysis is not completed', () => {
    renderButton(AnalysisStatus.RUNNING);
    const button = screen.getByRole('button', { name: /Exportar PDF/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Solo se pueden exportar análisis completados');
  });

  it('generates the report, downloads the PDF with the server file name and shows its checksum', async () => {
    renderButton();
    await userEvent.click(screen.getByRole('button', { name: /Exportar PDF/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(`Descargado segsoft-report-${REPORT_ID}.pdf`);
    });
    expect(reportsApi.generateReport).toHaveBeenCalledWith(ANALYSIS_ID);
    expect(reportsApi.exportReport).toHaveBeenCalledWith(REPORT_ID, 'pdf');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(clickedLinks[0].download).toBe(`segsoft-report-${REPORT_ID}.pdf`);
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:report');
    expect(screen.getByRole('status')).toHaveTextContent(`SHA-256 ${CHECKSUM.slice(0, 16)}`);
  });

  it('re-downloads the same report instead of generating a new one on every click', async () => {
    renderButton();
    const button = screen.getByRole('button', { name: /Exportar PDF/i });
    await userEvent.click(button);
    await waitFor(() => expect(reportsApi.exportReport).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole('button', { name: /Exportar PDF/i }));
    await waitFor(() => expect(reportsApi.exportReport).toHaveBeenCalledTimes(2));

    expect(reportsApi.generateReport).toHaveBeenCalledTimes(1);
  });

  it('explains an integrity failure (409) and downloads nothing', async () => {
    vi.mocked(reportsApi.exportReport).mockRejectedValue(axiosErrorWithStatus(409));
    renderButton();
    await userEvent.click(screen.getByRole('button', { name: /Exportar PDF/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/verificación de integridad/i);
    });
    expect(clickSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the backend message read from a JSON error returned as a Blob', async () => {
    const body = new Blob([JSON.stringify({ errorCode: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado' })], {
      type: 'application/json',
    });
    vi.mocked(reportsApi.exportReport).mockRejectedValue(axiosErrorWithStatus(500, body));
    renderButton();
    await userEvent.click(screen.getByRole('button', { name: /Exportar PDF/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Ocurrió un error inesperado');
    });
  });

  it('falls back to a generic message when the error has no readable body', async () => {
    vi.mocked(reportsApi.generateReport).mockRejectedValue(new Error('Network Error'));
    renderButton();
    await userEvent.click(screen.getByRole('button', { name: /Exportar PDF/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('No se pudo exportar el reporte. Intenta de nuevo.');
    });
    expect(reportsApi.exportReport).not.toHaveBeenCalled();
  });
});
