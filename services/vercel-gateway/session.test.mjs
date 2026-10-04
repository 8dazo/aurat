import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { scryptSync } from 'node:crypto';
import gateway from './index.mjs';
import { session } from './session.mjs';
let upstream, server, base, cookie, received;
const saved = { ...process.env };
before(async () => {
  const salt = 'a'.repeat(32);
  process.env.AURAT_LOGIN_USER = 'owner';
  process.env.AURAT_LOGIN_PASSWORD_HASH = salt + ':' + scryptSync('synthetic-password', salt, 64).toString('hex');
  process.env.AURAT_SESSION_SECRET = 's'.repeat(64);
  process.env.AURAT_WORKSPACE_TOKEN = 'private-server-token'.repeat(3);
  upstream = createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    received = { url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString() };
    res.writeHead(req.url.startsWith('/api/') && req.headers.authorization !== 'Bearer ' + process.env.AURAT_WORKSPACE_TOKEN ? 401 : 200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ projects: [], runs: [] }));
  }).listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  process.env.PLATFORM_URL = process.env.WORKSPACE_URL = 'http://127.0.0.1:' + upstream.address().port;
  server = createServer(gateway).listen(0, '127.0.0.1'); await once(server, 'listening');
  base = 'http://127.0.0.1:' + server.address().port;
  process.env.AURAT_ALLOWED_ORIGINS = base;
});
after(async () => {
  for (const key of ['AURAT_LOGIN_USER','AURAT_LOGIN_PASSWORD_HASH','AURAT_SESSION_SECRET','AURAT_WORKSPACE_TOKEN','PLATFORM_URL','WORKSPACE_URL','AURAT_ALLOWED_ORIGINS']) {
    if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
  }
  await Promise.all([new Promise(resolve => upstream.close(resolve)),new Promise(resolve => server.close(resolve))]);
});
test('workspace requires sign-in; the explicit example remains public', async () => {
  const r = await fetch(base + '/app/', { redirect: 'manual' });
  assert.equal(r.status, 302); assert.ok(r.headers.get('location').startsWith('/signin/'));
  assert.equal((await fetch(base + '/app/?demo=1')).status, 200);
  assert.equal((await fetch(base + '/api/workspace')).status, 401);
});
test('login rejects incorrect passwords and cross-origin requests', async () => {
  const body = JSON.stringify({ username: 'owner', password: 'incorrect' });
  assert.equal((await fetch(base + '/api/auth/signin', { method:'POST', headers:{ origin:base }, body })).status, 401);
  assert.equal((await fetch(base + '/api/auth/signin', { method:'POST', headers:{ origin:'https://evil.invalid' }, body })).status, 403);
  assert.equal((await fetch(base + '/api/auth/signin', { method:'POST', headers:{ origin:base }, body:'x'.repeat(4097) })).status, 400);
});
test('login creates a secure session without exposing the server key', async () => {
  const r = await fetch(base + '/api/auth/signin', { method:'POST', headers:{ origin:base, 'content-type':'application/json' }, body:JSON.stringify({ username:'owner', password:'synthetic-password' }) });
  assert.equal(r.status, 200);
  const value = r.headers.get('set-cookie');
  for (const attribute of ['Secure','HttpOnly','SameSite=Strict','Path=/']) assert.ok(value.includes(attribute));
  assert.equal(value.includes(process.env.AURAT_WORKSPACE_TOKEN), false);
  cookie = value.split(';')[0];
  assert.equal((await r.text()).includes(process.env.AURAT_WORKSPACE_TOKEN), false);
});
test('session restores API access after reload and injects credentials only for the backend', async () => {
  const r = await fetch(base + '/api/workspace', { headers:{ cookie } });
  assert.equal(r.status, 200); assert.equal(r.headers.get('cache-control'), 'private, no-store');
  assert.equal(received.headers.authorization, 'Bearer ' + process.env.AURAT_WORKSPACE_TOKEN);
  assert.equal(received.headers.cookie, undefined);
  await fetch(base + '/app/', { headers:{ cookie } });
  assert.equal(received.headers.authorization, undefined);
  assert.equal(received.headers.cookie, undefined);
  assert.equal((await fetch(base + '/api/auth/session', { headers:{ cookie } })).status, 200);
});
test('expired or forged cookies cannot authenticate', () => {
  assert.equal(session({headers:{cookie}}, Date.now() + 9 * 60 * 60 * 1000), false);
  assert.equal(session({headers:{cookie:cookie + 'forged'}}), false);
  assert.equal(session({headers:{cookie:'__Host-aurat-session=malformed'}}), false);
});
test('cookie mutations require same-origin requests; sign-out clears the cookie', async () => {
  assert.equal((await fetch(base + '/api/workspace', { method:'POST',headers:{cookie,origin:'https://evil.invalid'},body:'{}' })).status,403);
  const r = await fetch(base + '/api/workspace', {method:'POST',headers:{cookie,origin:base,'content-type':'application/json'},body:'{"action":"project"}'});
  assert.equal(r.status,200); assert.equal(received.body,'{"action":"project"}');
  const out = await fetch(base + '/api/auth/signout', {method:'POST',headers:{cookie,origin:base}});
  assert.equal(out.status,200); assert.ok(out.headers.get('set-cookie').includes('Max-Age=0'));
});
