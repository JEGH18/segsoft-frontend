import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AuthProvider } from '@/store/authStore';
import LoginForm from '@/components/auth/LoginForm';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import DashboardPage from '@/pages/DashboardPage';
import PolicyListPage from '@/components/policies/PolicyListPage';
import PolicyDetailPage from '@/components/policies/PolicyDetailPage';
import PolicySetListPage from '@/components/policySets/PolicySetListPage';
import PolicySetDetailPage from '@/components/policySets/PolicySetDetailPage';
import FileInventory from '@/components/repositories/FileInventory';
import PolicySelectionView from '@/components/repositories/PolicySelectionView';
import ReportListPage from '@/pages/reports/ReportListPage';
import ReportDetailPage from '@/pages/reports/ReportDetailPage';
import AnalysisResultsPage from '@/pages/analysis/AnalysisResultsPage';
import AnalysesLandingPage from '@/pages/analysis/AnalysesLandingPage';

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
          <Route path="/policy-sets" element={<PolicySetListPage />} />
          <Route path="/policy-sets/:id" element={<PolicySetDetailPage />} />
          <Route path="/repositories/:repoId/files" element={<RepositoryFilesPage />} />
          <Route path="/repositories/:repoId/policy-selection" element={<PolicySelectionPage />} />
          <Route path="/analyses" element={<AnalysesLandingPage />} />
          <Route path="/analyses/:id/results" element={<AnalysisResultsPage />} />
          <Route path="/reports" element={<ReportListPage />} />
          <Route path="/reports/:id" element={<ReportDetailPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
