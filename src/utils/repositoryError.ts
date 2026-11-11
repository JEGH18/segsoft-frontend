import { isAxiosError } from 'axios';

/**
 * A message the user can act on when uploading a ZIP or cloning a repository fails.
 *
 * The backend answers with JSON ({ message }), but some failures never reach it: Vercel's proxy
 * rejects large bodies with a plain-text 413, an unreachable server gives no response at all.
 * Those used to end up as the generic "Error al procesar el repositorio".
 */
export function repositoryErrorMessage(err: unknown, mode: 'ZIP' | 'GIT'): string {
  if (!isAxiosError(err)) {
    return 'Error al procesar el repositorio';
  }

  const data = err.response?.data as unknown;
  if (data && typeof data === 'object' && typeof (data as { message?: unknown }).message === 'string') {
    return (data as { message: string }).message;
  }

  const status = err.response?.status;
  if (status === 413) {
    return 'El archivo es demasiado grande para subirlo (máximo 100 MB). Comprime solo el código fuente, '
      + 'sin node_modules, .git, dist ni build.';
  }
  if (status === undefined) {
    return mode === 'ZIP'
      ? 'No se pudo subir el archivo: no hubo respuesta del servidor de SegSoft. Revisa tu conexión e '
        + 'inténtalo de nuevo; si continúa, el servidor puede estar apagado.'
      : 'No hubo respuesta del servidor de SegSoft. Revisa tu conexión e inténtalo de nuevo; si continúa, '
        + 'el servidor puede estar apagado.';
  }
  if (status === 502 || status === 503 || status === 504) {
    return 'El servidor de SegSoft no está disponible en este momento. Inténtalo de nuevo en unos minutos.';
  }
  return `Error al procesar el repositorio (HTTP ${status})`;
}
