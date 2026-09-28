import axiosInstance from '@/utils/axiosInstance';
import type {
  CreatePolicySetRequest,
  PolicySetAuditLogEntry,
  PolicySetDetailResponse,
  PolicySetPage,
  PolicySetResponse,
  UpdatePolicySetRequest,
} from '@/types/policySet';

export interface ListPolicySetsParams {
  status?: 'ACTIVE' | 'ARCHIVED';
  search?: string;
  page?: number;
  size?: number;
}

export async function listPolicySets(params: ListPolicySetsParams = {}): Promise<PolicySetPage> {
  const { status, search, page, size } = params;
  const query: Record<string, string | number> = {};
  if (status) query.status = status;
  if (search) query.search = search;
  if (page !== undefined) query.page = page;
  if (size !== undefined) query.size = size;
  const response = await axiosInstance.get<PolicySetPage>('/api/v1/policy-sets', { params: query });
  return response.data;
}

export async function getPolicySetById(id: string): Promise<PolicySetDetailResponse> {
  const response = await axiosInstance.get<PolicySetDetailResponse>(`/api/v1/policy-sets/${id}`);
  return response.data;
}

export async function createPolicySet(data: CreatePolicySetRequest): Promise<PolicySetResponse> {
  const response = await axiosInstance.post<PolicySetResponse>('/api/v1/policy-sets', data);
  return response.data;
}

export async function updatePolicySet(id: string, data: UpdatePolicySetRequest): Promise<PolicySetResponse> {
  const response = await axiosInstance.patch<PolicySetResponse>(`/api/v1/policy-sets/${id}`, data);
  return response.data;
}

export async function archivePolicySet(id: string): Promise<void> {
  await axiosInstance.delete(`/api/v1/policy-sets/${id}`);
}

export async function restorePolicySet(id: string): Promise<PolicySetResponse> {
  const response = await axiosInstance.post<PolicySetResponse>(`/api/v1/policy-sets/${id}/restore`);
  return response.data;
}

export async function getPolicySetAuditLog(id: string): Promise<PolicySetAuditLogEntry[]> {
  const response = await axiosInstance.get<PolicySetAuditLogEntry[]>(`/api/v1/policy-sets/${id}/audit-log`);
  return response.data;
}
