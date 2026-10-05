import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import ReportDownloadButtons from '@/components/reports/ReportDownloadButtons';
import type { ExportedReportFile, ReportSummary } from '@/types/report';

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
vi.mock('@/api/reports', () => ({ exportReport: vi.fn() }));

import * as reportsApi from '@/api/reports';

const REPORT_ID = 'r2222222-2222-2222-2222-222222222222';

function report(overrides: Partial<ReportSummary> = {}): ReportSummary {
  return {
    id: REPORT_ID,
    analysisId: 'a1',
    status: 'GENERATED',
    checksum: 'a'.repeat(64),
    generatedAt: '2026-10-04T18:00:00Z',
    generatedBy: 'auditor',
    repositoryName: 'acme',
    compliancePercentage: 90,
    weightedCompliancePercentage: 91,
    policiesEvaluated: 10,
    totalFindings: 2,
    findingsBySeverity: { MEDIUM: 2 },
    integrityVerified: true,
    exportFormats: ['pdf', 'sarif'],
    ...overrides,
  };
}

function file(format: string, cache: 'HIT' | 'MISS' = 'MISS'): ExportedReportFile {
  return { blob: new Blob(['x']), fileName: `segsoft-report-${REPORT_ID}.${format}`, cache };
}

function axiosError(status: number, body: unknown = {}) {
  const data = new Blob([JSON.stringify(body)], { type: 'application/json' });
  return new AxiosError('error', String(status), undefined, undefined, {
    status,
    data,
    statusText: 'error',
    headers: {},
    // @ts-expect-error minimal mock config, not used by the component
    config: {},
  });
}

describe('ReportDownloadButtons', () => {
  let clickedLinks: HTMLAnchorElement[];

  beforeEach(() => {
    vi.clearAllMocks();
    auth.roles = ['AUDITOR'];
    clickedLinks = [];
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clickedLinks.push(this);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([['AUDITOR'], ['SECURITY_ADMIN']])('shows both download buttons to %s', (role) => {
    auth.roles = [role];
    render(<ReportDownloadButtons report={report()} />);
    expect(screen.getByRole('button', { name: /Descargar PDF/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Descargar SARIF/ })).toBeEnabled();
  });

  it('renders nothing for a DEVELOPER', () => {
    auth.roles = ['DEVELOPER'];
    const { container } = render(<ReportDownloadButtons report={report()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for a report that is not GENERATED', () => {
    const { container } = render(
      <ReportDownloadButtons report={report({ status: 'ARCHIVED' as ReportSummary['status'] })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('only offers the formats the backend supports', () => {
    render(<ReportDownloadButtons report={report({ exportFormats: ['pdf'] })} />);
    expect(screen.getByRole('button', { name: /Descargar PDF/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Descargar SARIF/ })).not.toBeInTheDocument();
  });

  it('shows a loading indicator, disables the button and ignores repeated clicks while generating', async () => {
    let resolve!: (value: ExportedReportFile) => void;
    vi.mocked(reportsApi.exportReport).mockReturnValue(new Promise((r) => (resolve = r)));
    render(<ReportDownloadButtons report={report()} />);

    await userEvent.click(screen.getByRole('button', { name: /Descargar PDF/ }));

    const busy = screen.getByRole('button', { name: /Generando PDF/ });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(busy);
    expect(reportsApi.exportReport).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /Descargar SARIF/ })).toBeEnabled();

    resolve(file('pdf'));
    await waitFor(() => expect(screen.getByRole('button', { name: /Descargar PDF/ })).toBeEnabled());
  });

  it('downloads the file under the name from Content-Disposition', async () => {
    vi.mocked(reportsApi.exportReport).mockResolvedValue(file('sarif', 'HIT'));
    render(<ReportDownloadButtons report={report()} />);

    await userEvent.click(screen.getByRole('button', { name: /Descargar SARIF/ }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(`segsoft-report-${REPORT_ID}.sarif`));
    expect(reportsApi.exportReport).toHaveBeenCalledWith(REPORT_ID, 'sarif');
    expect(clickedLinks).toHaveLength(1);
    expect(clickedLinks[0].download).toBe(`segsoft-report-${REPORT_ID}.sarif`);
    expect(screen.getByRole('status')).toHaveTextContent('(desde caché)');
  });

  it.each([
    [409, {}, /verificación de integridad/],
    [422, { message: 'El archivo exportado ocupa 61.0 MB y supera el tamaño máximo permitido de 50 MB' }, /máximo permitido de 50 MB/],
    [500, { traceId: 'trace-123' }, /reporta el código trace-123/],
  ])('explains a %s error in plain language and downloads nothing', async (status, body, message) => {
    vi.mocked(reportsApi.exportReport).mockRejectedValue(axiosError(status, body));
    render(<ReportDownloadButtons report={report()} />);

    await userEvent.click(screen.getByRole('button', { name: /Descargar PDF/ }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(message));
    expect(clickedLinks).toHaveLength(0);
    expect(screen.getByRole('button', { name: /Descargar PDF/ })).toBeEnabled();
  });

  it('explains a network failure', async () => {
    vi.mocked(reportsApi.exportReport).mockRejectedValue(new Error('Network Error'));
    render(<ReportDownloadButtons report={report()} />);

    await userEvent.click(screen.getByRole('button', { name: /Descargar PDF/ }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/No se pudo contactar al servidor/));
  });
});
