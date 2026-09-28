import { useQuery } from '@tanstack/react-query';
import { getFrameworkControls } from '@/api/frameworks';
import { Framework } from '@/types/enums';

export function useFrameworkControls(framework: Framework | '' | undefined) {
  return useQuery({
    queryKey: ['framework-controls', framework],
    queryFn: () => getFrameworkControls(framework as Framework),
    enabled: !!framework,
    // Reference catalog data, not user data: doesn't change during a session.
    staleTime: Infinity,
  });
}
