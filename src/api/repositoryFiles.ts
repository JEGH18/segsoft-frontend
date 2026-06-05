import axiosInstance from '@/utils/axiosInstance';
import type { FileInventoryFilters, FileInventoryResponse } from '@/types/repository';

export async function getRepositoryFiles(
  repoId: string,
  filters: FileInventoryFilters,
): Promise<{ data: FileInventoryResponse; status: number }> {
  const params = new URLSearchParams();
  if (filters.language) params.set('language', filters.language);
  if (filters.artifactType) params.set('artifactType', filters.artifactType);
  params.set('page', String(filters.page));
  params.set('size', String(filters.size));

  const response = await axiosInstance.get<FileInventoryResponse>(
    `/api/v1/repositories/${repoId}/files?${params.toString()}`,
    { validateStatus: (s) => s === 200 || s === 202 },
  );

  return { data: response.data, status: response.status };
}
