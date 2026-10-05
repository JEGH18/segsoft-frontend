import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AxiosError } from 'axios';
import GenerateReportButton from '@/components/reports/GenerateReportButton';
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
vi.mock('@/api/reports', () => ({ generateReport: vi.fn() }));

import * as reportsApi from '@/api/reports';

const ANALYSIS_ID = 'a1111111-1111-1111-1111-111111111111';
const REPORT_ID = 'r2222222-2222-2222-2222-222222222222';

function renderButton(status = AnalysisStatus.COMPLETED) {
  return render(
    <MemoryRouter initialEntries={['/analysis']}>
      <Routes>
        <Route path="/analysis" element={<GenerateReportButton analysisId={ANALYSIS_ID} analysisStatus={status} />} />
        <Route path="/reports/:id" element={<p>Vista del reporte</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('GenerateReportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.roles = ['AUDITOR'];
  });

  it('is not rendered for a DEVELOPER', () => {
    auth.roles = ['DEVELOPER'];
    renderButton();
    expect(screen.queryByRole('button', { name: /Generar reporte/ })).not.toBeInTheDocument();
  });

  it('is disabled until the analysis is completed', () => {
    renderButton(AnalysisStatus.RUNNING);
    expect(screen.getByRole('button', { name: /Generar reporte/ })).toBeDisabled();
  });

  it('generates the report and opens its view', async () => {
    vi.mocked(reportsApi.generateReport).mockResolvedValue({
      id: REPORT_ID,
      analysisId: ANALYSIS_ID,
      status: 'GENERATED',
      checksum: 'a'.repeat(64),
      generatedAt: '2026-10-04T18:00:00Z',
      url: `/api/v1/reports/${REPORT_ID}`,
    });
    renderButton();

    await userEvent.click(screen.getByRole('button', { name: /Generar reporte/ }));

    await waitFor(() => expect(screen.getByText('Vista del reporte')).toBeInTheDocument());
    expect(reportsApi.generateReport).toHaveBeenCalledWith(ANALYSIS_ID);
  });

  it('explains when the analysis cannot be reported yet (422)', async () => {
    vi.mocked(reportsApi.generateReport).mockRejectedValue(
      new AxiosError('error', '422', undefined, undefined, {
        status: 422,
        data: {},
        statusText: 'error',
        headers: {},
        // @ts-expect-error minimal mock config
        config: {},
      }),
    );
    renderButton();

    await userEvent.click(screen.getByRole('button', { name: /Generar reporte/ }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Solo se pueden generar reportes'));
    expect(screen.getByRole('button', { name: /Generar reporte/ })).toBeEnabled();
  });
});
