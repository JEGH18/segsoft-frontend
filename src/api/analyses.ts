import axiosInstance from '@/utils/axiosInstance';
import type { AnalysisResultsResponse, FindingsFilters, FindingsPageResponse } from '@/types/analysis';

export interface AnalysisResponse {
  id: string;
  repositoryId: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  rulesTotal: number;
  rulesExecuted: number;
  createdAt: string;
  completedAt: string | null;
}

export async function startAnalysis(repositoryId: string): Promise<AnalysisResponse> {
  const { data } = await axiosInstance.post<AnalysisResponse>('/api/v1/analyses', { repositoryId });
  return data;
}

export async function getAnalysis(analysisId: string): Promise<AnalysisResponse> {
  const { data } = await axiosInstance.get<AnalysisResponse>(`/api/v1/analyses/${analysisId}`);
  return data;
}

interface FindingsQuery {
  analysisId: string;
  page: number;
  size: number;
  filePath: string;
  filters: FindingsFilters;
}

export async function getAnalysisResults(analysisId: string): Promise<AnalysisResultsResponse> {
  const response = await axiosInstance.get<AnalysisResultsResponse>(`/api/v1/analyses/${analysisId}/results`);
  return response.data;
}

export async function getAnalysisFindings(query: FindingsQuery): Promise<FindingsPageResponse> {
  const params = new URLSearchParams();
  params.set('page', query.page.toString());
  params.set('size', query.size.toString());
  if (query.filters.severities.length > 0) {
    params.set('severity', query.filters.severities.join(','));
  }
  if (query.filters.categories.length > 0) {
    params.set('category', query.filters.categories.join(','));
  }
  if (query.filters.policyId.trim()) {
    params.set('policyId', query.filters.policyId.trim());
  }
  if (query.filePath.trim()) {
    params.set('filePath', query.filePath.trim());
  }

  const response = await axiosInstance.get<FindingsPageResponse>(
    `/api/v1/analyses/${query.analysisId}/findings?${params.toString()}`,
  );
  return response.data;
}
