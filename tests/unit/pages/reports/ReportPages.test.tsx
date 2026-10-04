import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import ReportDetailPage from '@/pages/reports/ReportDetailPage';
import ReportListPage from '@/pages/reports/ReportListPage';
import type { ReportSummary } from '@/types/report';

vi.mock('@/store/authStore', () => ({
  useAuth: () => ({
    user: { id: 'u1', username: 'auditor', roles: ['AUDITOR'] },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    setLoading: vi.fn(),
  }),
}));
vi.mock('@/api/reports', () => ({ getReport: vi.fn(), listReports: vi.fn(), exportReport: vi.fn() }));

import * as reportsApi from '@/api/reports';

const REPORT_ID = 'r2222222-2222-2222-2222-222222222222';

function summary(overrides: Partial<ReportSummary> = {}): ReportSummary {
  return {
    id: REPORT_ID,
    analysisId: 'a1111111-1111-1111-1111-111111111111',
    status: 'GENERATED',
    checksum: 'c'.repeat(64),
    generatedAt: '2026-10-04T18:00:00Z',
    generatedBy: 'auditor',
    repositoryName: 'SegSoft-Pruebas',
    compliancePercentage: 91.3,
    weightedCompliancePercentage: 92.5,
    policiesEvaluated: 23,
    totalFindings: 49,
    findingsBySeverity: { CRITICAL: 17, HIGH: 19, MEDIUM: 13, LOW: 0 },
    integrityVerified: true,
    exportFormats: ['pdf', 'sarif'],
    ...overrides,
  };
}

function httpError(status: number) {
  return new AxiosError('error', String(status), undefined, undefined, {
    status,
    data: {},
    statusText: 'error',
    headers: {},
    // @ts-expect-error minimal mock config
    config: {},
  });
}

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/reports" element={<ReportListPage />} />
          <Route path="/reports/:id" element={<ReportDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Report view', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the report summary, metadata and both download buttons', async () => {
    vi.mocked(reportsApi.getReport).mockResolvedValue(summary());
    renderAt(`/reports/${REPORT_ID}`);

    await waitFor(() => expect(screen.getByText('SegSoft-Pruebas')).toBeInTheDocument());
    expect(screen.getByText('Generado', { selector: 'span.badge' })).toBeInTheDocument();
    expect(screen.getByText('91,3 %')).toBeInTheDocument();
    expect(screen.getByText('49')).toBeInTheDocument();
    expect(screen.getByText('c'.repeat(64))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Descargar PDF/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Descargar SARIF/ })).toBeInTheDocument();
    expect(reportsApi.getReport).toHaveBeenCalledWith(REPORT_ID);
  });

  it('warns when the report failed its integrity check', async () => {
    vi.mocked(reportsApi.getReport).mockResolvedValue(summary({ integrityVerified: false }));
    renderAt(`/reports/${REPORT_ID}`);

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/checksum almacenado/));
  });

  it('shows a calm notice to users without access (403)', async () => {
    vi.mocked(reportsApi.getReport).mockRejectedValue(httpError(403));
    renderAt(`/reports/${REPORT_ID}`);

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Auditor y Security Admin/));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says when the report does not exist (404)', async () => {
    vi.mocked(reportsApi.getReport).mockRejectedValue(httpError(404));
    renderAt(`/reports/${REPORT_ID}`);

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('El reporte no existe.'));
  });
});

describe('Report list', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists the reports with a link to each view', async () => {
    vi.mocked(reportsApi.listReports).mockResolvedValue({
      content: [summary(), summary({ id: 'other', repositoryName: 'demo.zip', integrityVerified: false })],
      totalElements: 2,
      totalPages: 1,
      number: 0,
      size: 20,
    });
    renderAt('/reports');

    const link = await screen.findByRole('link', { name: 'SegSoft-Pruebas' });
    expect(link).toHaveAttribute('href', `/reports/${REPORT_ID}`);
    expect(screen.getByText('Verificada')).toBeInTheDocument();
    expect(screen.getByText('Alterado')).toBeInTheDocument();
  });

  it('invites generating one when there are no reports', async () => {
    vi.mocked(reportsApi.listReports).mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
    renderAt('/reports');

    expect(await screen.findByText(/Aún no hay reportes/)).toBeInTheDocument();
  });
});
