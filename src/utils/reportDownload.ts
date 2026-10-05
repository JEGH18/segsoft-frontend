import { AxiosError } from 'axios';

/** Hands a downloaded blob to the browser under the server-provided file name. */
export function saveFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Turns an export/generation failure into a message a user can act on.
 * Export calls use responseType 'blob', so a JSON error body arrives as a
 * Blob and is read before its message or traceId can be shown.
 */
export async function reportErrorMessage(err: unknown): Promise<string> {
  const response = (err as AxiosError | undefined)?.response;
  if (!response) {
    return 'No se pudo contactar al servidor. Revisa tu conexión e intenta de nuevo.';
  }
  const body = await readBody(response.data);
  switch (response.status) {
    case 403:
      return 'No tienes permisos para exportar reportes.';
    case 404:
      return 'El reporte ya no existe.';
    case 409:
      return 'El reporte no superó la verificación de integridad (checksum) y no se descargó. Contacta al administrador de seguridad.';
    case 422:
      return body.message ?? 'El archivo supera el tamaño máximo permitido para exportaciones.';
    case 500:
      return `El servidor no pudo generar el archivo. Intenta de nuevo más tarde${
        body.traceId ? ` o reporta el código ${body.traceId} al administrador` : ''
      }.`;
    default:
      return body.message ?? 'No se pudo completar la operación. Intenta de nuevo.';
  }
}

async function readBody(data: unknown): Promise<{ message?: string; traceId?: string }> {
  try {
    const body = data instanceof Blob ? JSON.parse(await data.text()) : data;
    return {
      message: typeof body?.message === 'string' ? body.message : undefined,
      traceId: typeof body?.traceId === 'string' && body.traceId !== 'unknown' ? body.traceId : undefined,
    };
  } catch {
    return {};
  }
}
