import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { authRoute, session, sameOrigin } from './session.mjs';

const requestHeaders = [
  'accept', 'accept-language', 'if-none-match', 'if-modified-since', 'range', 'if-range',
  // Preserve Next.js client navigation and prefetch semantics.
  'rsc', 'next-router-state-tree', 'next-router-prefetch', 'next-router-segment-prefetch', 'next-url',
];
const excludedResponseHeaders = new Set(['connection', 'transfer-encoding', 'content-encoding', 'content-length', 'keep-alive', 'set-cookie']);

// PLATFORM_URL is a runtime service binding, never a build-time or browser URL.
export default async function gateway(req, res) {
  const incoming = new URL(req.url ?? '/', 'http://request.invalid');
  const privateApi = incoming.pathname.startsWith('/api/') || incoming.pathname === '/mcp' || incoming.pathname === '/health';
  const allowed = privateApi ? ['GET', 'HEAD', 'POST', 'OPTIONS'] : ['GET', 'HEAD'];
  if (!allowed.includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' });
    res.end();
    return;
  }
  try {
    if (await authRoute(req, res, incoming.pathname.replace(/\/$/, ''))) return;
    const signedIn = session(req);
    if (process.env.AURAT_LOGIN_USER && incoming.pathname.startsWith('/app') && !signedIn && incoming.searchParams.get('demo') !== '1') {
      res.writeHead(302, { Location: '/signin/?returnTo=' + encodeURIComponent(incoming.pathname + incoming.search), 'Cache-Control': 'no-store' });
      res.end(); return;
    }
    if (privateApi && signedIn && !['GET', 'HEAD'].includes(req.method) && !sameOrigin(req)) {
      res.writeHead(403, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ error: 'Origin is not allowed' })); return;
    }
    const binding = privateApi ? process.env.WORKSPACE_URL : process.env.PLATFORM_URL;
    if (!binding) {
      res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ error: 'The platform service binding is unavailable.' }));
      return;
    }
    const base = new URL(binding);
    if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error('Invalid binding');
    if (!base.pathname.endsWith('/')) base.pathname += '/';
    // Parse against a fixed origin so a request path cannot choose the upstream.
    const target = new URL(incoming.pathname.slice(1) + incoming.search, base);
    if (target.origin !== base.origin || !target.pathname.startsWith(base.pathname)) throw new Error('Invalid path');
    const headers = new Headers();
    const apiHeaders = ['authorization', 'origin', 'content-type', 'mcp-protocol-version', 'x-hub-signature-256', 'x-github-event', 'x-github-delivery'];
    for (const name of privateApi ? ['accept', ...apiHeaders] : requestHeaders) {
      const value = req.headers[name];
      if (typeof value === 'string') headers.set(name, value);
    }
    // A verified browser session becomes a server-to-server credential. Never
    // expose the workspace key or forward browser cookies to an internal service.
    if (privateApi && signedIn && !headers.has('authorization') && process.env.AURAT_WORKSPACE_TOKEN)
      headers.set('authorization', `Bearer ${process.env.AURAT_WORKSPACE_TOKEN}`);
    // This service only serves public exports; do not forward credentials or
    // Sites trusted-user headers to a target that has no standalone auth.
    const upstream = await fetch(target, {
      method: req.method, headers, redirect: 'manual', signal: AbortSignal.timeout(30000),
      ...(req.method === 'POST' ? { body: req, duplex: 'half' } : {}),
    });
    res.statusCode = upstream.status;
    for (const [name, value] of upstream.headers) {
      if (!excludedResponseHeaders.has(name)) res.setHeader(name, value);
    }
    if (privateApi || incoming.pathname.startsWith('/app')) res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Aurat-Revision', process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'development');
    const location = upstream.headers.get('location');
    if (location) {
      const destination = new URL(location, target);
      if (destination.origin === base.origin && destination.pathname.startsWith(base.pathname)) {
        res.setHeader('location', '/' + destination.pathname.slice(base.pathname.length) + destination.search + destination.hash);
      }
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (req.method === 'HEAD' || !upstream.body) res.end();
    else await pipeline(Readable.fromWeb(upstream.body), res);
  } catch {
    if (res.headersSent) res.destroy();
    else {
      res.writeHead(502, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ error: 'The platform service could not be reached.' }));
    }
  }
}
