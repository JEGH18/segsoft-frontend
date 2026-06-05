import axiosInstance from '@/utils/axiosInstance';
import type { CreateRuleRequest, RulePage, RuleResponse } from '@/types/rule';

export async function listRules(policyId: string, page = 0, size = 20): Promise<RulePage> {
  const response = await axiosInstance.get<RulePage>(
    `/api/v1/policies/${policyId}/rules`,
    { params: { page, size } },
  );
  return response.data;
}

export async function createRule(policyId: string, data: CreateRuleRequest): Promise<RuleResponse> {
  const response = await axiosInstance.post<RuleResponse>(
    `/api/v1/policies/${policyId}/rules`,
    data,
  );
  return response.data;
}

export async function archiveRule(ruleId: string): Promise<RuleResponse> {
  const response = await axiosInstance.delete<RuleResponse>(`/api/v1/rules/${ruleId}`);
  return response.data;
}
