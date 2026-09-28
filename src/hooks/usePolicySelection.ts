import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { listPolicies } from '@/api/policies';
import {
  applyPolicySet,
  createPolicySelection,
  getPolicySelection,
  updatePolicySelection,
} from '@/api/policySelection';
import type { PolicySelectionRequest, PolicySelectionResponse } from '@/types/policySelection';

export function usePolicies() {
  return useQuery({
    queryKey: ['policies', 'ACTIVE'],
    // Dashboard framework cards + the analysis policy-selection screen must
    // only ever offer usable policies. Explicit now because the backend's
    // "no status filter" default changed to mean "every status", not ACTIVE.
    queryFn: () => listPolicies({ size: 100, status: 'ACTIVE' }),
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

export function useApplyPolicySet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ repositoryId, policySetId }: { repositoryId: string; policySetId: string }) =>
      applyPolicySet(repositoryId, { policySetId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['policy-selection', variables.repositoryId] });
    },
  });
}
