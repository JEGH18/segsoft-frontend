import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { listPolicies } from '@/api/policies';
import {
  createPolicySelection,
  getPolicySelection,
  updatePolicySelection,
} from '@/api/policySelection';
import type { PolicySelectionRequest, PolicySelectionResponse } from '@/types/policySelection';

export function usePolicies() {
  return useQuery({
    queryKey: ['policies'],
    queryFn: () => listPolicies({ size: 100 }),
  });
}

export function usePolicySelection(repositoryId: string | undefined) {
  return useQuery({
    queryKey: ['policy-selection', repositoryId],
    enabled: Boolean(repositoryId),
    queryFn: async () => {
      if (!repositoryId) {
        return null;
      }
      try {
        return await getPolicySelection(repositoryId);
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        if (axiosError.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
  });
}

interface SaveSelectionParams {
  repositoryId: string;
  data: PolicySelectionRequest;
  hasExistingSelection: boolean;
}

export function useSavePolicySelection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      repositoryId,
      data,
      hasExistingSelection,
    }: SaveSelectionParams): Promise<PolicySelectionResponse> => {
      if (hasExistingSelection) {
        return updatePolicySelection(repositoryId, data);
      }
      return createPolicySelection(repositoryId, data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['policy-selection', variables.repositoryId] });
    },
  });
}
