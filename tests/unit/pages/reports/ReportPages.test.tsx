import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import ReportDetailPage from '@/pages/reports/ReportDetailPage';
import ReportListPage from '@/pages/reports/ReportListPage';
import type { ReportSummary } from '@/types/report';
import { REPORT_ID, REPOSITORY_ID, executiveReport, technicalReport } from '../../fixtures/structuredReport';

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

function summary(overrides: Partial<ReportSummary> = {}): ReportSummary {
  return {
    id: REPORT_ID,
    analysisId: 'a1',
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

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname + location.search}</span>;
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
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Report preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reportsApi.getReport).mockImplementation(async (_id, view) =>
      view === 'executive' ? executiveReport() : technicalReport(),
    );
  });

  it('opens in the technical view with every section and the evidence', async () => {
    renderAt(`/reports/${REPORT_ID}`);

    expect(await screen.findByText(/SegSoft-Pruebas · generado/)).toBeInTheDocument();
    expect(reportsApi.getReport).toHaveBeenCalledWith(REPORT_ID, 'technical');
    expect(screen.getByRole('button', { name: 'Vista técnica' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('8,7 %')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recomendaciones priorizadas' })).toBeInTheDocument();
    expect(screen.getByText('Mover las credenciales a un gestor de secretos.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Resultados por política' })).toBeInTheDocument();
    expect(screen.getByText('String password = *****')).toBeInTheDocument();
    expect(screen.getByText('A02:2021')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver histórico de reportes' })).toHaveAttribute(
      'href',
      `/reports?repositoryId=${REPOSITORY_ID}`,
    );
  });

  it.each([['technical'], ['executive']])('shows the five Claude Code Security categories in the %s view', async (view) => {
    renderAt(`/reports/${REPORT_ID}${view === 'executive' ? '?view=executive' : ''}`);

    const list = await screen.findByRole('list', { name: 'Categorías del catálogo' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
    expect(within(list).getByText('Vulnerabilidad en Dependencias')).toBeInTheDocument();
    expect(within(list).getByText('Sin cobertura')).toBeInTheDocument();
  });

  it('switches to the executive view: metrics and recommendations, no snippets, and the URL records it', async () => {
    renderAt(`/reports/${REPORT_ID}`);
    await screen.findByText('String password = *****');

    await userEvent.click(screen.getByRole('button', { name: 'Vista ejecutiva' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Vista ejecutiva' })).toHaveAttribute('aria-pressed', 'true'));
    await waitFor(() => expect(screen.queryByText('String password = *****')).not.toBeInTheDocument());
    expect(reportsApi.getReport).toHaveBeenLastCalledWith(REPORT_ID, 'executive');
    expect(screen.getByTestId('location')).toHaveTextContent(`/reports/${REPORT_ID}?view=executive`);
    expect(screen.queryByRole('heading', { name: 'Resultados por política' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Hallazgos detallados/)).not.toBeInTheDocument();
    expect(screen.getByText('Mover las credenciales a un gestor de secretos.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Descargar PDF/ })).toBeInTheDocument();
  });

  it('explains a tampered report (409) instead of showing it', async () => {
    vi.mocked(reportsApi.getReport).mockRejectedValue(httpError(409));
    renderAt(`/reports/${REPORT_ID}`);

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/fue alterado después de generarse/));
    expect(screen.queryByRole('button', { name: /Descargar PDF/ })).not.toBeInTheDocument();
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

describe('Report history', () => {
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

  it('filters the history by repository and can clear the filter', async () => {
    vi.mocked(reportsApi.listReports).mockResolvedValue({ content: [summary()], totalElements: 1, totalPages: 1, number: 0, size: 20 });
    renderAt(`/reports?repositoryId=${REPOSITORY_ID}`);

    expect(await screen.findByText(/Histórico de un repositorio: SegSoft-Pruebas/)).toBeInTheDocument();
    expect(reportsApi.listReports).toHaveBeenCalledWith(0, 20, { repositoryId: REPOSITORY_ID });

    await userEvent.click(screen.getByRole('button', { name: 'Ver todos' }));
    await waitFor(() => expect(reportsApi.listReports).toHaveBeenLastCalledWith(0, 20, { repositoryId: undefined }));
  });

  it('invites generating one when there are no reports', async () => {
    vi.mocked(reportsApi.listReports).mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
    renderAt('/reports');

    expect(await screen.findByText(/Aún no hay reportes/)).toBeInTheDocument();
  });
});
