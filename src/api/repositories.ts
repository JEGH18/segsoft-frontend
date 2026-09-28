import axiosInstance from '@/utils/axiosInstance';
import type { CloneRepositoryRequest, RepositoryResponse } from '@/types/repository';

export async function uploadZip(file: File): Promise<RepositoryResponse> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await axiosInstance.post<RepositoryResponse>('/api/v1/repositories', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
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
