import axiosInstance from '@/utils/axiosInstance';
import type { CloneRepositoryRequest, RepositoryResponse } from '@/types/repository';

// In production the API is reached through Vercel's /api proxy, which rejects request bodies
// above ~4.5 MB (413 FUNCTION_PAYLOAD_TOO_LARGE). ZIP uploads therefore go straight to the
// backend when VITE_UPLOAD_BASE_URL is set (see .env.production). The access token travels in
// the Authorization header, so no cookie is needed for this cross-origin request.
const UPLOAD_BASE_URL = import.meta.env.VITE_UPLOAD_BASE_URL?.trim() || undefined;

export async function uploadZip(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<RepositoryResponse> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await axiosInstance.post<RepositoryResponse>('/api/v1/repositories', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...(UPLOAD_BASE_URL ? { baseURL: UPLOAD_BASE_URL, withCredentials: false } : {}),
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.min(100, Math.round((event.loaded * 100) / event.total)));
      }
    },
  });
  return data;
}

export async function cloneGit(request: CloneRepositoryRequest): Promise<RepositoryResponse> {
  const { data } = await axiosInstance.post<RepositoryResponse>('/api/v1/repositories/git', request);
  return data;
}

export async function getRepository(id: string): Promise<RepositoryResponse> {
  const { data } = await axiosInstance.get<RepositoryResponse>(`/api/v1/repositories/${id}`);
  return data;
}

export async function deleteRepository(id: string): Promise<void> {
  await axiosInstance.delete(`/api/v1/repositories/${id}`);
}
