import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listPolicies,
  getPolicyById,
  updatePolicy,
  archivePolicy,
  restorePolicy,
  getPolicyAuditLog,
  getPolicyTraceability,
} from '@/api/policies';
import type { PolicyFilters, UpdatePolicyRequest } from '@/types/policy';

export function usePolicies(filters: PolicyFilters) {
  return useQuery({
    queryKey: ['policies', filters],
    queryFn: () => listPolicies(filters),
    // No staleTime override: status changes (archive/restore) made from
    // another tab/page must show up as soon as this list is focused or
    // remounted, not sit "fresh" in cache for up to a minute.
    placeholderData: (previousData) => previousData,
  });
}

export function usePolicy(id: string | undefined) {
  return useQuery({
    queryKey: ['policy', id],
    queryFn: () => getPolicyById(id!),
    enabled: !!id,
  });
}

export function usePolicyTraceability(id: string | undefined) {
  return useQuery({
    queryKey: ['policy-traceability', id],
    queryFn: () => getPolicyTraceability(id!),
    enabled: !!id,
  });
}

export function usePolicyAuditLog(id: string | undefined) {
  return useQuery({
    queryKey: ['policy-audit-log', id],
    queryFn: () => getPolicyAuditLog(id!),
    enabled: !!id,
  });
}

export function useUpdatePolicy(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, ifMatchVersion }: { data: UpdatePolicyRequest; ifMatchVersion: number }) =>
      updatePolicy(id, data, ifMatchVersion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy', id] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['policy-audit-log', id] });
    },
  });
}

export function useArchivePolicy(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => archivePolicy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy', id] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['policy-audit-log', id] });
    },
  });
}

export function useRestorePolicy(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => restorePolicy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy', id] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['policy-audit-log', id] });
    },
  });
}
