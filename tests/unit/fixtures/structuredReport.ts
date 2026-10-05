import type { StructuredReport } from '@/types/report';

export const REPORT_ID = 'r2222222-2222-2222-2222-222222222222';
export const ANALYSIS_ID = 'a1111111-1111-1111-1111-111111111111';
export const REPOSITORY_ID = 'b3333333-3333-3333-3333-333333333333';
const POLICY_ID = 'p4444444-4444-4444-4444-444444444444';

const coverage = (category: string, evaluated: number, compliant: number, pct: number | null) => ({
  category,
  policiesEvaluated: evaluated,
  compliantPolicies: compliant,
  nonCompliantPolicies: evaluated - compliant,
  requiresReviewPolicies: 0,
  findings: evaluated - compliant,
  highOrCriticalFindings: evaluated - compliant,
  compliancePercentage: pct,
});

export function technicalReport(overrides: Partial<StructuredReport> = {}): StructuredReport {
  return {
    id: REPORT_ID,
    status: 'GENERATED',
    view: 'technical',
    schemaVersion: 3,
    checksum: 'c'.repeat(64),
    integrityVerified: true,
    exportFormats: ['pdf', 'sarif'],
    metadata: {
      reportId: REPORT_ID,
      analysisId: ANALYSIS_ID,
      repositoryId: REPOSITORY_ID,
      repoName: 'SegSoft-Pruebas',
      sourceType: 'GIT',
      branch: 'main',
      generatedAt: '2026-10-04T18:00:00Z',
      generatedBy: 'auditor',
      analysisStartedAt: '2026-10-04T17:58:00Z',
      analysisCompletedAt: '2026-10-04T17:59:00Z',
      rulesExecuted: 24,
      rulesTotal: 24,
    },
    executiveSummary: {
      compliancePercentage: 8.7,
      weightedCompliancePercentage: 9.1,
      totalPolicies: 23,
      compliantPolicies: 2,
      nonCompliantPolicies: 20,
      requiresReviewPolicies: 1,
      totalFindings: 47,
      highOrCriticalFindings: 35,
      highestSeverity: 'CRITICAL',
      ruleExecutionErrors: 0,
      recommendations: [
        {
          priority: 1,
          policyId: POLICY_ID,
          policyName: 'No almacenar secretos en código fuente',
          category: 'INSECURE_DATA_HANDLING',
          status: 'NON_COMPLIANT',
          highestSeverity: 'CRITICAL',
          findings: 3,
          highOrCriticalFindings: 3,
          action: 'Mover las credenciales a un gestor de secretos.',
        },
      ],
    },
    policyResults: [
      {
        policyId: POLICY_ID,
        name: 'No almacenar secretos en código fuente',
        category: 'INSECURE_DATA_HANDLING',
        framework: 'OWASP_TOP_10_2021',
        controlId: 'A02:2021',
        weight: 95,
        status: 'NON_COMPLIANT',
        findingsCount: 3,
        highOrCriticalCount: 3,
        lowOrMediumCount: 0,
      },
    ],
    findingsBySeverity: {
      CRITICAL: {
        count: 1,
        findings: [
          {
            findingId: 'f1',
            policyId: POLICY_ID,
            policyName: 'No almacenar secretos en código fuente',
            ruleId: 'r1',
            severity: 'CRITICAL',
            category: 'INSECURE_DATA_HANDLING',
            cweId: 'CWE-798',
            filePath: 'proyecto-vulnerable/backend/Config.java',
            lineNumber: 12,
            evidenceSnippet: 'String password = *****',
            suggestedAction: 'Usar variables de entorno.',
          },
        ],
      },
      HIGH: { count: 0, findings: [] },
      MEDIUM: { count: 0, findings: [] },
      LOW: { count: 0, findings: [] },
    },
    claudeCodeSecurityCoverage: [
      coverage('SQL_INJECTION', 4, 0, 0),
      coverage('XSS', 4, 1, 25),
      coverage('AUTHENTICATION_FAILURE', 5, 1, 20),
      coverage('INSECURE_DATA_HANDLING', 5, 0, 0),
      coverage('DEPENDENCY_VULNERABILITY', 0, 0, null),
    ],
    frameworkCoverage: [
      {
        framework: 'OWASP_TOP_10_2021',
        policiesEvaluated: 4,
        compliantPolicies: 1,
        nonCompliantPolicies: 3,
        requiresReviewPolicies: 0,
        findings: 10,
        highOrCriticalFindings: 8,
        compliancePercentage: 25,
        controls: [{ controlId: 'A02:2021', status: 'NON_COMPLIANT', policyIds: [POLICY_ID] }],
      },
    ],
    traceabilityReference: {
      self: `/api/v1/reports/${REPORT_ID}`,
      executiveView: `/api/v1/reports/${REPORT_ID}?view=executive`,
      technicalView: `/api/v1/reports/${REPORT_ID}?view=technical`,
      repositoryHistory: `/api/v1/reports?repositoryId=${REPOSITORY_ID}`,
      analysis: `/api/v1/analyses/${ANALYSIS_ID}`,
      analysisResults: `/api/v1/analyses/${ANALYSIS_ID}/results`,
      analysisFindings: `/api/v1/analyses/${ANALYSIS_ID}/findings`,
      findingDetailTemplate: '/api/v1/findings/{findingId}',
      exports: { pdf: `/api/v1/reports/${REPORT_ID}/export?format=pdf` },
      policies: [],
    },
    ...overrides,
  };
}

/** What the API returns for ?view=executive: no policyResults, no findings, no controls. */
export function executiveReport(): StructuredReport {
  const technical = technicalReport();
  const { policyResults: _omitted, ...rest } = technical;
  void _omitted;
  return {
    ...rest,
    view: 'executive',
    findingsBySeverity: {
      CRITICAL: { count: 1 },
      HIGH: { count: 0 },
      MEDIUM: { count: 0 },
      LOW: { count: 0 },
    },
    frameworkCoverage: technical.frameworkCoverage.map(({ controls: _c, ...f }) => {
      void _c;
      return f;
    }),
  };
}
