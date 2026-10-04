import { createHmac, timingSafeEqual, scrypt as derive, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(derive);
const name = '__Host-aurat-session';
const duration = 8 * 60 * 60;
const attempts = new Map();
const equal = (a, b) => a.length === b.length && timingSafeEqual(a, b);
function config() {
  const { AURAT_LOGIN_USER: user, AURAT_LOGIN_PASSWORD_HASH: hash, AURAT_SESSION_SECRET: secret } = process.env;
  if (!user || !/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash ?? '') || (secret?.length ?? 0) < 32) return null;
  return { user, hash, secret };
}
export function session(req, now = Date.now()) {
  const c = config();
  if (!c) return false;
  const cookie = (req.headers.cookie ?? '').split(';').map(x => x.trim()).find(x => x.startsWith(name + '='))?.slice(name.length + 1);
  if (!cookie || cookie.length > 1024) return false;
  const [payload, signature, extra] = cookie.split('.');
  if (!payload || !signature || extra) return false;
  const expected = createHmac('sha256', c.secret).update(payload).digest('base64url');
  if (!equal(Buffer.from(signature), Buffer.from(expected))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.user === c.user && Number.isSafeInteger(data.expires) && data.expires > now && data.expires <= now + duration * 1000;
  } catch { return false; }
}
export function sameOrigin(req) {
  const allowed = (process.env.AURAT_ALLOWED_ORIGINS ?? '').split(',').filter(Boolean);
  for (const host of [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]) {
    if (host) allowed.push('https://' + host);
  }
  if (!process.env.VERCEL && /^127\.0\.0\.1:\d+$/.test(req.headers.host ?? '')) allowed.push('http://' + req.headers.host);
  return typeof req.headers.origin === 'string' && allowed.includes(req.headers.origin);
}
function reply(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(value));
}
export async function authRoute(req, res, path) {
  if (!['/api/auth/signin', '/api/auth/signout', '/api/auth/session'].includes(path)) return false;
  if (path === '/api/auth/session' && req.method === 'GET') {
    reply(res, session(req) ? 200 : 401, { authenticated: session(req), user: session(req) ? config().user : null });
    return true;
  }
  if (req.method !== 'POST') { reply(res, 405, { error: 'Use POST' }); return true; }
  if (!sameOrigin(req)) { reply(res, 403, { error: 'Origin is not allowed' }); return true; }
  if (path === '/api/auth/signout') {
    res.setHeader('Set-Cookie', `${name}=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0`);
    reply(res, 200, { ok: true }); return true;
  }
  const c = config();
  if (!c) { reply(res, 503, { error: 'Sign-in is not configured' }); return true; }
  // Bounded per-instance throttling. Platform firewall limits should complement it.
  const now = Date.now(), ip = req.socket?.remoteAddress ?? 'unknown';
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
  const count = attempts.get(ip) ?? { count: 0, until: now + 60000 };
  if (count.count >= 10 || attempts.size >= 1000) { reply(res, 429, { error: 'Too many attempts. Try again in a minute.' }); return true; }
  count.count++; attempts.set(ip, count);
  try {
    let size = 0; const chunks = [];
    for await (const chunk of req) { size += chunk.length; if (size > 4096) throw Error('body'); chunks.push(chunk); }
    const data = JSON.parse(Buffer.concat(chunks).toString());
    if (typeof data.username !== 'string' || typeof data.password !== 'string' || data.password.length > 256) throw Error('body');
    const [salt, hash] = c.hash.split(':');
    const candidate = await scrypt(data.password, salt, 64);
    if (!equal(candidate, Buffer.from(hash, 'hex')) || data.username !== c.user) {
      reply(res, 401, { error: 'Incorrect username or password' }); return true;
    }
    attempts.delete(ip);
    const payload = Buffer.from(JSON.stringify({ user: c.user, expires: now + duration * 1000, nonce: randomBytes(16).toString('hex') })).toString('base64url');
    const signature = createHmac('sha256', c.secret).update(payload).digest('base64url');
    res.setHeader('Set-Cookie', `${name}=${payload}.${signature}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${duration}`);
    reply(res, 200, { ok: true });
  } catch { reply(res, 400, { error: 'Invalid sign-in request' }); }
  return true;
}
