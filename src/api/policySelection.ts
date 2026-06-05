import axiosInstance from '@/utils/axiosInstance';
import type { PolicySelectionRequest, PolicySelectionResponse } from '@/types/policySelection';

export async function getPolicySelection(repositoryId: string): Promise<PolicySelectionResponse> {
  const response = await axiosInstance.get<PolicySelectionResponse>(
    `/api/v1/repositories/${repositoryId}/policy-selection`,
  );
  return response.data;
}

export async function createPolicySelection(
  repositoryId: string,
  data: PolicySelectionRequest,
): Promise<PolicySelectionResponse> {
  const response = await axiosInstance.post<PolicySelectionResponse>(
    `/api/v1/repositories/${repositoryId}/policy-selection`,
    data,
  );
  return response.data;
}

export async function updatePolicySelection(
  repositoryId: string,
  data: PolicySelectionRequest,
): Promise<PolicySelectionResponse> {
  const response = await axiosInstance.put<PolicySelectionResponse>(
    `/api/v1/repositories/${repositoryId}/policy-selection`,
    data,
  );
  return response.data;
}
