// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import middleware, { config } from '../../middleware';

const SECRET = 'secreto-compartido-con-el-backend';

function apiRequest(extraHeaders: Record<string, string> = {}) {
  return new Request('https://www.segsoft.website/api/v1/auth/login?x=1', {
    method: 'POST',
    headers: {
      host: 'www.segsoft.website',
      'x-real-ip': '181.53.12.7',
      'content-type': 'application/json',
      authorization: 'Bearer token',
      ...extraHeaders,
    },
  });
}

describe('Vercel middleware', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('only runs for the API', () => {
    expect(config.matcher).toBe('/api/:path*');
  });

  it('sends the real client IP and the shared secret to the backend', () => {
    vi.stubEnv('PROXY_SECRET', SECRET);

    const response = middleware(apiRequest());

    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'https://segsoft-icesi.westus3.cloudapp.azure.com/api/v1/auth/login?x=1',
    );
    expect(response.headers.get('x-middleware-request-x-segsoft-client-ip')).toBe('181.53.12.7');
    expect(response.headers.get('x-middleware-request-x-segsoft-proxy-secret')).toBe(SECRET);
    // The rest of the request goes on unchanged, except Host, which the rewrite sets.
    expect(response.headers.get('x-middleware-request-authorization')).toBe('Bearer token');
    expect(response.headers.get('x-middleware-request-content-type')).toBe('application/json');
    expect(response.headers.get('x-middleware-override-headers')?.split(',')).not.toContain('host');
  });

  it('replaces whatever the browser claims in the proxy headers', () => {
    vi.stubEnv('PROXY_SECRET', SECRET);

    const response = middleware(
      apiRequest({ 'x-segsoft-client-ip': '1.2.3.4', 'x-segsoft-proxy-secret': 'adivinado' }),
    );

    expect(response.headers.get('x-middleware-request-x-segsoft-client-ip')).toBe('181.53.12.7');
    expect(response.headers.get('x-middleware-request-x-segsoft-proxy-secret')).toBe(SECRET);
  });

  it('honours BACKEND_ORIGIN', () => {
    vi.stubEnv('PROXY_SECRET', SECRET);
    vi.stubEnv('BACKEND_ORIGIN', 'https://api.example.com');

    const response = middleware(apiRequest());

    expect(response.headers.get('x-middleware-rewrite')).toBe('https://api.example.com/api/v1/auth/login?x=1');
  });

  it('without PROXY_SECRET leaves the request to the rewrite of vercel.json', () => {
    vi.stubEnv('PROXY_SECRET', '');

    const response = middleware(apiRequest());

    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('x-middleware-rewrite')).toBeNull();
    expect(response.headers.get('x-middleware-request-x-segsoft-proxy-secret')).toBeNull();
  });
});
