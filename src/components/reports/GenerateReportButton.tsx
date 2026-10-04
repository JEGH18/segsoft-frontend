import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateReport } from '@/api/reports';
import { useAuth } from '@/store/authStore';
import { AnalysisStatus } from '@/types/enums';
import { reportErrorMessage } from '@/utils/reportDownload';
import Spinner from './Spinner';

const REPORT_ROLES = ['AUDITOR', 'SECURITY_ADMIN'];

interface GenerateReportButtonProps {
  analysisId: string;
  analysisStatus: AnalysisStatus;
}

/**
 * Freezes a completed analysis into a compliance report and opens the
 * report view, where its PDF and SARIF exports are downloaded.
 */
export default function GenerateReportButton({ analysisId, analysisStatus }: GenerateReportButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowed = user?.roles.some((role) => REPORT_ROLES.includes(role)) ?? false;
  if (!allowed) return null;

  const completed = analysisStatus === AnalysisStatus.COMPLETED;

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const report = await generateReport(analysisId);
      navigate(`/reports/${report.id}`);
    } catch (err) {
      setError((err as { response?: { status?: number } })?.response?.status === 422
        ? 'Solo se pueden generar reportes de análisis completados.'
        : await reportErrorMessage(err));
      setGenerating(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        className="btn-primary"
        onClick={() => void handleGenerate()}
        disabled={!completed || generating}
        title={completed ? undefined : 'Solo se pueden generar reportes de análisis completados'}
      >
        {generating ? <Spinner /> : (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M7 4h7l5 5v11a1 1 0 01-1 1H7a1 1 0 01-1-1V5a1 1 0 011-1z" />
          </svg>
        )}
        {generating ? 'Generando reporte…' : 'Generar reporte'}
      </button>
      {error && (
        <p role="alert" className="max-w-xs text-right text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
