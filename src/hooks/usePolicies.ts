import { useQuery } from '@tanstack/react-query';
import { listPolicies, getPolicyById } from '@/api/policies';
import type { PolicyFilters } from '@/types/policy';

export function usePolicies(filters: PolicyFilters) {
  return useQuery({
    queryKey: ['policies', filters],
    queryFn: () => listPolicies(filters),
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  });
}

export function usePolicy(id: string | undefined) {
  return useQuery({
    queryKey: ['policy', id],
    queryFn: () => getPolicyById(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}
