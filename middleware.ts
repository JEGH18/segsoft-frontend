import { ipAddress } from '@vercel/functions/headers';
import { next, rewrite } from '@vercel/functions/middleware';

// Vercel Routing Middleware: runs on Vercel before the rewrites of vercel.json, only for /api.
//
// The backend sits behind this proxy and Caddy, so the only address it sees is Vercel's, shared
// by many users: useless for its audit log and its per-IP limits. Here the real client IP is
// sent along with PROXY_SECRET, a secret the backend also knows (TRUSTED_PROXY_SECRET), so the
// backend can trust that IP while a caller who reaches the server directly cannot fake it.
//
// Without PROXY_SECRET this does nothing and the rewrite of vercel.json proxies the request as
// before.

export const config = { matcher: '/api/:path*' };

const CLIENT_IP_HEADER = 'x-segsoft-client-ip';
const PROXY_SECRET_HEADER = 'x-segsoft-proxy-secret';
const DEFAULT_BACKEND_ORIGIN = 'https://segsoft-icesi.westus3.cloudapp.azure.com';

export default function middleware(request: Request): Response {
  const secret = process.env.PROXY_SECRET?.trim();
  const ip = ipAddress(request);
  if (!secret || !ip) {
    return next();
  }

  const headers = new Headers(request.headers);
  // Host is left to the rewrite, which sets the backend's; whatever the browser sent in the two
  // proxy headers is replaced.
  headers.delete('host');
  headers.set(CLIENT_IP_HEADER, ip);
  headers.set(PROXY_SECRET_HEADER, secret);

  const { pathname, search } = new URL(request.url);
  const backend = process.env.BACKEND_ORIGIN?.trim() || DEFAULT_BACKEND_ORIGIN;
  return rewrite(new URL(pathname + search, backend), { request: { headers } });
}
