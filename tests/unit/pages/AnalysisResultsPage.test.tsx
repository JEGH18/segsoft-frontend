import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AxiosError } from 'axios';
import AnalysisResultsPage from '@/pages/analysis/AnalysisResultsPage';

vi.mock('@/api/analyses', () => ({
  getAnalysisResults: vi.fn(),
  getAnalysisFindings: vi.fn(),
}));
vi.mock('@/api/findings', () => ({
  getFindingDetail: vi.fn(),
}));

import * as analysesApi from '@/api/analyses';

const ANALYSIS_ID = 'a1111111-1111-1111-1111-111111111111';

function axiosErrorWithStatus(status: number) {
  return new AxiosError('error', String(status), undefined, undefined, {
    status,
    data: {},
    statusText: 'error',
    headers: {},
    // @ts-expect-error minimal mock config, not used by the component
    config: {},
  });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/analyses/${ANALYSIS_ID}/results`]}>
      <Routes>
        <Route path="/analyses/:id/results" element={<AnalysisResultsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AnalysisResultsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(analysesApi.getAnalysisFindings).mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 20,
      first: true,
      last: true,
    });
  });

  it('shows a calm, non-alarming notice (not the generic error box) when the analysis belongs to another user (403)', async () => {
    vi.mocked(analysesApi.getAnalysisResults).mockRejectedValue(axiosErrorWithStatus(403));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Este análisis no está disponible para tu usuario\./i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/No se pudieron cargar los resultados del análisis\./i)).not.toBeInTheDocument();
    // A 403 is not styled as an error/alert -- it's a calm status notice.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('still shows the generic error box for a real failure (500)', async () => {
    vi.mocked(analysesApi.getAnalysisResults).mockRejectedValue(axiosErrorWithStatus(500));
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar los resultados del análisis.');
    });
    expect(screen.queryByText(/no está disponible para tu usuario/i)).not.toBeInTheDocument();
  });
});
