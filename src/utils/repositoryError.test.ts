import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { repositoryErrorMessage } from './repositoryError';

function httpError(status: number, data: unknown): AxiosError {
  const response = {
    status,
    data,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', undefined, undefined, response);
}

describe('repositoryErrorMessage', () => {
  it('shows the message the backend sent', () => {
    const err = httpError(413, { message: 'El ZIP supera el límite de 5000 archivos' });
    expect(repositoryErrorMessage(err, 'ZIP')).toBe('El ZIP supera el límite de 5000 archivos');
  });

  it('explains a 413 that is not JSON (Vercel proxy body limit)', () => {
    const err = httpError(413, 'Request Entity Too Large\n\nFUNCTION_PAYLOAD_TOO_LARGE');
    expect(repositoryErrorMessage(err, 'ZIP')).toMatch(/demasiado grande.*node_modules/s);
  });

  it('explains when the server never answered', () => {
    const err = new AxiosError('Network Error', 'ERR_NETWORK');
    expect(repositoryErrorMessage(err, 'ZIP')).toMatch(/no hubo respuesta del servidor/i);
  });

  it('explains a gateway error', () => {
    expect(repositoryErrorMessage(httpError(502, 'An error occurred'), 'GIT')).toMatch(/no está disponible/);
  });

  it('includes the status for anything else', () => {
    expect(repositoryErrorMessage(httpError(500, ''), 'ZIP')).toBe('Error al procesar el repositorio (HTTP 500)');
  });

  it('falls back for non-HTTP errors', () => {
    expect(repositoryErrorMessage(new Error('boom'), 'ZIP')).toBe('Error al procesar el repositorio');
  });
});
