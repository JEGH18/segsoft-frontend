import { Navigate, useNavigate } from 'react-router-dom';
import { getLastAnalysisId } from '@/utils/lastAnalysis';

export default function AnalysesLandingPage() {
  const navigate = useNavigate();
  const lastAnalysisId = getLastAnalysisId();

  if (lastAnalysisId) {
    return <Navigate to={`/analyses/${lastAnalysisId}/results`} replace />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
      <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-400 mb-4">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-neutral-700">Aún no has ejecutado ningún análisis</p>
      <p className="text-xs text-neutral-400 mt-1">Sube un proyecto para ver sus resultados aquí</p>
      <button type="button" onClick={() => navigate('/')} className="btn-primary mt-5">
        Analizar un proyecto
      </button>
    </div>
  );
}
