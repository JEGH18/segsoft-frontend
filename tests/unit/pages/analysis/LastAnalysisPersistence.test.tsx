import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import AnalysisResultsPage from '@/pages/analysis/AnalysisResultsPage';
import AnalysesLandingPage from '@/pages/analysis/AnalysesLandingPage';
import { getLastAnalysisId } from '@/utils/lastAnalysis';
import type { AnalysisResultsResponse, FindingsPageResponse } from '@/types/analysis';

// jsdom has no ResizeObserver; the results dashboard's recharts container needs one.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

vi.mock('@/api/analyses', () => ({
  getAnalysisResults: vi.fn(),
  getAnalysisFindings: vi.fn(),
}));
vi.mock('@/api/findings', () => ({
  getFindingDetail: vi.fn(),
}));

// The results page renders the role-gated export button, which reads the
// logged-in user; a DEVELOPER keeps it hidden so this test is unaffected.
vi.mock('@/store/authStore', () => ({
  useAuth: () => ({
    user: { id: 'u1', username: 'dev', roles: ['DEVELOPER'] },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    setLoading: vi.fn(),
  }),
}));

import * as analysesApi from '@/api/analyses';

const ANALYSIS_ID = 'aae37f67-41e9-44ce-b817-3bf748290643';

const results: AnalysisResultsResponse = {
  analysis: {
    id: ANALYSIS_ID,
    repositoryId: 'repo-1',
    status: 'COMPLETED',
    rulesExecuted: 18,
    rulesTotal: 18,
    progress: 100,
    createdAt: '2026-08-24T12:32:11.988Z',
    startedAt: '2026-08-24T12:32:12.032Z',
    completedAt: '2026-08-24T12:32:12.971Z',
    cancelledAt: null,
    errorMessage: null,
  },
  findings: [],
  policyResults: [],
  ruleExecutionErrors: [],
  compliancePercentage: 42,
  categoryBreakdown: {},
};

const findingsPage: FindingsPageResponse = {
  content: [],
  number: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
};

/** Mirrors the relevant slice of AppRouter: results page, a dummy Policies
 * page, and the "Análisis" nav target that should recall the last analysis. */
function TestApp() {
  return (
    <MemoryRouter initialEntries={[`/analyses/${ANALYSIS_ID}/results`]}>
      <nav>
        <Link to="/policies">Policies</Link>
        <Link to="/analyses">Análisis</Link>
      </nav>
      <Routes>
        <Route path="/policies" element={<div>Policies page</div>} />
        <Route path="/analyses" element={<AnalysesLandingPage />} />
        <Route path="/analyses/:id/results" element={<AnalysisResultsPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('last-viewed analysis persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(analysesApi.getAnalysisResults).mockResolvedValue(results);
    vi.mocked(analysesApi.getAnalysisFindings).mockResolvedValue(findingsPage);
  });

  it('remembers the analysis id after viewing its results', async () => {
    render(<TestApp />);

    await waitFor(() => {
      expect(getLastAnalysisId()).toBe(ANALYSIS_ID);
    });
  });

  it('navigating to Policies and back to Análisis returns to the same analysis results', async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    await waitFor(() => {
      expect(getLastAnalysisId()).toBe(ANALYSIS_ID);
    });

    await user.click(screen.getByRole('link', { name: 'Policies' }));
    expect(screen.getByText('Policies page')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Análisis' }));

    await waitFor(() => {
      expect(screen.getByText('Resultados del análisis')).toBeInTheDocument();
    });
    expect(screen.getByText(ANALYSIS_ID)).toBeInTheDocument();
  });

  it('shows an empty state instead of a dead end when no analysis has been viewed yet', () => {
    render(
      <MemoryRouter initialEntries={['/analyses']}>
        <Routes>
          <Route path="/analyses" element={<AnalysesLandingPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/aún no has ejecutado ningún análisis/i)).toBeInTheDocument();
  });
});
