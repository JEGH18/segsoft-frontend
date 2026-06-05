import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/store/authStore';
import LoginForm from '@/components/auth/LoginForm';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import DashboardPage from '@/pages/DashboardPage';
import PolicyListPage from '@/components/policies/PolicyListPage';
import PolicyDetailPage from '@/components/policies/PolicyDetailPage';
import FileInventory from '@/components/repositories/FileInventory';
import PolicySelectionView from '@/components/repositories/PolicySelectionView';
import AnalysisResultsPage from '@/pages/analysis/AnalysisResultsPage';

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
      <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-400 mb-4">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-neutral-700">{label}</p>
      <p className="text-xs text-neutral-400 mt-1">Próximamente disponible</p>
    </div>
  );
}

function RepositoryFilesPage() {
  const { repoId } = useParams<{ repoId: string }>();
  if (!repoId) return <div role="alert">Repositorio no encontrado.</div>;
  return <FileInventory repositoryId={repoId} />;
}

function PolicySelectionPage() {
  const { repoId } = useParams<{ repoId: string }>();
  if (!repoId) return <div role="alert">Repositorio no encontrado.</div>;
  return <PolicySelectionView repositoryId={repoId} />;
}

function AnalysesIndex() {
  const { lastAnalysisId } = useAuth();
  if (lastAnalysisId) {
    return <Navigate to={`/analyses/${lastAnalysisId}/results`} replace />;
  }
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
      <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-400 mb-4">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-neutral-700">Sin análisis reciente</p>
      <p className="text-xs text-neutral-400 mt-1">Ejecuta un análisis desde un repositorio para ver los resultados aquí.</p>
    </div>
  );
}

export default function AppRouter() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginForm />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/policies" element={<PolicyListPage />} />
          <Route path="/policies/:id" element={<PolicyDetailPage />} />
          <Route path="/repositories/:repoId/files" element={<RepositoryFilesPage />} />
          <Route path="/repositories/:repoId/policy-selection" element={<PolicySelectionPage />} />
          <Route path="/analyses" element={<AnalysesIndex />} />
          <Route path="/analyses/:id/results" element={<AnalysisResultsPage />} />
          <Route path="/reports" element={<ComingSoon label="History" />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
