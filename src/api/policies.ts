import axiosInstance from '@/utils/axiosInstance';
import { CreatePolicyRequest, PolicyFilters, PolicyPage, PolicyResponse } from '@/types/policy';

export async function createPolicy(data: CreatePolicyRequest): Promise<PolicyResponse> {
  const response = await axiosInstance.post<PolicyResponse>('/api/v1/policies', data);
  return response.data;
}

export async function listPolicies(filters: PolicyFilters): Promise<PolicyPage> {
  const params: Record<string, string | number> = {};
  if (filters.framework) params.framework = filters.framework;
  if (filters.category) params.category = filters.category;
  if (filters.status) params.status = filters.status;
  if (filters.name) params.name = filters.name;
  params.page = filters.page ?? 0;
  params.size = filters.size ?? 10;

  const response = await axiosInstance.get<PolicyPage>('/api/v1/policies', { params });
  return response.data;
}

export async function getPolicyById(id: string): Promise<PolicyResponse> {
  const response = await axiosInstance.get<PolicyResponse>(`/api/v1/policies/${id}`);
  return response.data;
}
