import axiosInstance from '@/utils/axiosInstance';
import type { FindingDetailResponse } from '@/types/analysis';

export async function getFindingDetail(findingId: string): Promise<FindingDetailResponse> {
  const response = await axiosInstance.get<FindingDetailResponse>(`/api/v1/findings/${findingId}`);
  return response.data;
}
