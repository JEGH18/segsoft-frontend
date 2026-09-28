import { useQuery } from '@tanstack/react-query';
import { getIso27002Controls } from '@/api/frameworks';

/**
 * Escenario 1: una vez elegido el control del Anexo A (derivado de la
 * categoría), se despliega el listado de guías de implementación 27002
 * que corresponden exactamente a ese control -- no el catálogo completo.
 */
export function useIso27002Controls(relatedControl: string | undefined) {
  return useQuery({
    queryKey: ['iso27002-controls', relatedControl],
    queryFn: () => getIso27002Controls(relatedControl),
    enabled: !!relatedControl,
    staleTime: Infinity,
  });
}
