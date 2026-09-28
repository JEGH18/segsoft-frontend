import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AnalysisResultsPage from '@/pages/analysis/AnalysisResultsPage';
import type { AnalysisResultsResponse, FindingDetailResponse, FindingsPageResponse } from '@/types/analysis';

vi.mock('@/api/analyses', () => ({
  getAnalysisResults: vi.fn(),
  getAnalysisFindings: vi.fn(),
}));
vi.mock('@/api/findings', () => ({
  getFindingDetail: vi.fn(),
}));

import * as analysesApi from '@/api/analyses';
import * as findingsApi from '@/api/findings';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

const ANALYSIS_ID = 'a1111111-1111-1111-1111-111111111111';
const FINDING_ID = 'f2222222-2222-2222-2222-222222222222';

const results: AnalysisResultsResponse = {
  analysis: {
    id: ANALYSIS_ID,
    repositoryId: 'repo-1',
    status: 'COMPLETED',
    rulesExecuted: 1,
    rulesTotal: 1,
    progress: 100,
    createdAt: '2026-08-26T00:00:00Z',
    startedAt: '2026-08-26T00:00:00Z',
    completedAt: '2026-08-26T00:00:01Z',
    cancelledAt: null,
    errorMessage: null,
  },
  findings: [],
  policyResults: [],
  ruleExecutionErrors: [],
  compliancePercentage: 50,
  categoryBreakdown: {},
};

const findingsPage: FindingsPageResponse = {
  content: [
    {
      id: FINDING_ID,
      policyId: 'p1',
      policyName: 'Prevención de SQL Injection',
      ruleId: 'r1',
      severity: 'CRITICAL',
      category: 'SQL_INJECTION',
      filePath: 'src/main/java/com/demo/UserDao.java',
      lineNumber: 6,
      evidenceSnippet: 'String sql = "SELECT * FROM usuarios WHERE id = " + id;',
      fileSha256: 'abc',
      cweId: 'CWE-89',
      suggestedAction: 'Usa PreparedStatement con parámetros en lugar de concatenar strings.',
    },
  ],
  number: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
};

const detail: FindingDetailResponse = {
  id: FINDING_ID,
  analysisId: ANALYSIS_ID,
  policyId: 'p1',
  policyName: 'Prevención de SQL Injection',
  framework: 'OWASP_TOP_10_2021',
  controlId: 'A03:2021',
  category: 'SQL_INJECTION',
  ruleType: 'PATTERN_REGEX',
  filePath: 'src/main/java/com/demo/UserDao.java',
  lineNumber: 6,
  evidenceSnippet: 'String sql = "SELECT * FROM usuarios WHERE id = " + id;',
  cweId: 'CWE-89',
  severity: 'CRITICAL',
  suggestedAction: 'Usa PreparedStatement con parámetros en lugar de concatenar strings.',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/analyses/${ANALYSIS_ID}/results`]}>
      <Routes>
        <Route path="/analyses/:id/results" element={<AnalysisResultsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('finding detail drawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(analysesApi.getAnalysisResults).mockResolvedValue(results);
    vi.mocked(analysesApi.getAnalysisFindings).mockResolvedValue(findingsPage);
    vi.mocked(findingsApi.getFindingDetail).mockResolvedValue(detail);
  });

  it('opens the drawer with the fix recommendation when a finding row is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('src/main/java/com/demo/UserDao.java')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Ver detalle ›'));

    await waitFor(() => {
      expect(findingsApi.getFindingDetail).toHaveBeenCalledWith(FINDING_ID);
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /detalle del finding/i })).toBeInTheDocument();
    });
    expect(screen.getByText('Cómo solucionarlo')).toBeInTheDocument();
    expect(screen.getByText(/Usa PreparedStatement con parámetros/)).toBeInTheDocument();
    expect(screen.getAllByText('CWE-89').length).toBeGreaterThan(0);
  });

  it('closes the drawer content when the close button is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('src/main/java/com/demo/UserDao.java')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Ver detalle ›'));

    await waitFor(() => {
      expect(screen.getByText('Cómo solucionarlo')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /cerrar detalle de finding/i }));

    await waitFor(() => {
      expect(screen.queryByText('Cómo solucionarlo')).not.toBeInTheDocument();
    });
  });
});
