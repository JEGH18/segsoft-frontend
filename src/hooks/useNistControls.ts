import { useQuery } from '@tanstack/react-query';
import { getNistControls } from '@/api/frameworks';

export function useNistControls(enabled: boolean) {
  return useQuery({
    queryKey: ['nist-controls'],
    queryFn: () => getNistControls(),
    enabled,
    // Reference catalog data, not user data: doesn't change during a session.
    staleTime: Infinity,
  });
}
