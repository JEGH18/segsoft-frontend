import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  archivePolicySet,
  createPolicySet,
  getPolicySetAuditLog,
  getPolicySetById,
  listPolicySets,
  restorePolicySet,
  updatePolicySet,
} from '@/api/policySets';
import type { ListPolicySetsParams } from '@/api/policySets';
import type { CreatePolicySetRequest, UpdatePolicySetRequest } from '@/types/policySet';

/**
 * The Dashboard picker and the "aplicar un Policy Set" selector on the
 * analysis screen just want a flat, unpaginated list of active sets -- this
 * keeps that contract (a plain array) even though the backend endpoint is
 * now paginated, so neither of those callers needs to change.
 */
export function usePolicySets(status?: 'ACTIVE' | 'ARCHIVED') {
  return useQuery({
    queryKey: ['policy-sets', status ?? 'ACTIVE'],
    queryFn: () => listPolicySets({ status, size: 100 }),
    select: (data) => data.content,
    placeholderData: (previousData) => previousData,
  });
}

/** Full catalog view: paginated, filterable by status, searchable by name. */
export function usePolicySetCatalog(params: ListPolicySetsParams) {
  return useQuery({
    queryKey: ['policy-sets-catalog', params.status ?? 'ACTIVE', params.search ?? '', params.page ?? 0, params.size ?? 10],
    queryFn: () => listPolicySets(params),
    placeholderData: (previousData) => previousData,
  });
}

export function usePolicySet(id: string | undefined) {
  return useQuery({
    queryKey: ['policy-set', id],
    queryFn: () => getPolicySetById(id!),
    enabled: !!id,
  });
}

export function usePolicySetAuditLog(id: string | undefined) {
  return useQuery({
    queryKey: ['policy-set-audit-log', id],
    queryFn: () => getPolicySetAuditLog(id!),
    enabled: !!id,
  });
}

export function useCreatePolicySet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePolicySetRequest) => createPolicySet(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-sets'] });
      queryClient.invalidateQueries({ queryKey: ['policy-sets-catalog'] });
    },
  });
}

export function useUpdatePolicySet(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePolicySetRequest) => updatePolicySet(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-set', id] });
      queryClient.invalidateQueries({ queryKey: ['policy-sets'] });
      queryClient.invalidateQueries({ queryKey: ['policy-sets-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['policy-set-audit-log', id] });
    },
  });
}

export function useArchivePolicySet(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => archivePolicySet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-set', id] });
      queryClient.invalidateQueries({ queryKey: ['policy-sets'] });
      queryClient.invalidateQueries({ queryKey: ['policy-sets-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['policy-set-audit-log', id] });
    },
  });
}

export function useRestorePolicySet(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => restorePolicySet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-set', id] });
      queryClient.invalidateQueries({ queryKey: ['policy-sets'] });
      queryClient.invalidateQueries({ queryKey: ['policy-sets-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['policy-set-audit-log', id] });
    },
  });
}
