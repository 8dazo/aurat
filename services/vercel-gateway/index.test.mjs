import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import gateway from './index.mjs';

let upstream, publicServer, base, received;
const savedBinding = process.env.PLATFORM_URL;
const savedWorkspace = process.env.WORKSPACE_URL;
before(async () => {
  upstream = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    received = { url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString() };
    if (req.url === '/internal/app') {
      res.writeHead(308, { Location: '/internal/app/' });
      res.end();
    } else if (req.url === '/internal/missing') {
      res.writeHead(404); res.end('Not found');
    } else {
      res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=60' });
      res.end('public export');
    }
  }).listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  process.env.PLATFORM_URL = `http://127.0.0.1:${upstream.address().port}/internal`;
  process.env.WORKSPACE_URL = `http://127.0.0.1:${upstream.address().port}/private`;
  publicServer = createServer(gateway).listen(0, '127.0.0.1');
  await once(publicServer, 'listening');
  base = `http://127.0.0.1:${publicServer.address().port}`;
});
after(async () => {
  if (savedBinding === undefined) delete process.env.PLATFORM_URL;
  else process.env.PLATFORM_URL = savedBinding;
  if (savedWorkspace === undefined) delete process.env.WORKSPACE_URL;
  else process.env.WORKSPACE_URL = savedWorkspace;
  await Promise.all([new Promise(resolve => upstream.close(resolve)), new Promise(resolve => publicServer.close(resolve))]);
});
test('bound target receives paths and queries, including assets', async () => {
  for (const path of ['/docs/', '/app/runs/scout-fixed/?demo=1', '/_next/static/chunk.js']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'public export');
    assert.equal(received.url, '/internal' + path);
    assert.equal(response.headers.get('cache-control'), path.startsWith('/app') ? 'private, no-store' : 'public, max-age=60');
  }
});
test('private binding URLs do not leak through redirects', async () => {
  const response = await fetch(base + '/app', { redirect: 'manual' });
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), '/app/');
});
test('Next.js client-navigation headers reach the frontend', async () => {
  await fetch(base + '/app/?_rsc=synthetic', { headers: { rsc: '1', 'next-router-prefetch': '1', 'next-url': '/app/' } });
  assert.equal(received.url, '/internal/app/?_rsc=synthetic');
  assert.equal(received.headers.rsc, '1');
  assert.equal(received.headers['next-router-prefetch'], '1');
  assert.equal(received.headers['next-url'], '/app/');
});
test('public credentials and trusted identity headers are not forwarded', async () => {
  await fetch(base + '/docs/', { headers: {
    authorization: 'Bearer synthetic-token', cookie: 'session=synthetic-cookie',
    'oai-authenticated-user-id': 'forged-owner', 'oai-authenticated-user-email': 'fake@example.invalid',
  } });
  for (const key of ['authorization', 'cookie', 'oai-authenticated-user-id', 'oai-authenticated-user-email']) {
    assert.equal(received.headers[key], undefined);
  }
});
test('HEAD and upstream 404 work; mutation requests are rejected', async () => {
  const head = await fetch(base + '/docs/', { method: 'HEAD' });
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
  assert.equal((await fetch(base + '/missing')).status, 404);
  const mutation = await fetch(base + '/docs/', { method: 'POST', body: '{}' });
  assert.equal(mutation.status, 405); assert.equal(mutation.headers.get('allow'), 'GET, HEAD');
});
test('API credentials and exact webhook bodies reach only the workspace binding', async () => {
  const body = '{ "exact": "signed bytes" }';
  await fetch(base + '/api/webhooks/github', { method: 'POST', body, headers: {
    authorization: 'Bearer synthetic-private-token', 'content-type': 'application/json',
    'x-hub-signature-256': 'synthetic-signature', cookie: 'private-cookie',
    'oai-authenticated-user-id': 'forged-owner',
  }});
  assert.equal(received.url, '/private/api/webhooks/github');
  assert.equal(received.body, body);
  assert.equal(received.headers.authorization, 'Bearer synthetic-private-token');
  assert.equal(received.headers['x-hub-signature-256'], 'synthetic-signature');
  assert.equal(received.headers.cookie, undefined);
  assert.equal(received.headers['oai-authenticated-user-id'], undefined);
  await fetch(base + '/docs/', { headers: { authorization: 'Bearer synthetic-private-token' }});
  assert.equal(received.headers.authorization, undefined);
});
test('missing workspace binding never falls through to the public frontend', async () => {
  const binding = process.env.WORKSPACE_URL;
  delete process.env.WORKSPACE_URL;
  assert.equal((await fetch(base + '/api/workspace')).status, 503);
  process.env.WORKSPACE_URL = binding;
});
test('missing binding fails clearly; client-controlled hosts cannot choose an upstream', async () => {
  const binding = process.env.PLATFORM_URL;
  delete process.env.PLATFORM_URL;
  assert.equal((await fetch(base + '/')).status, 503);
  process.env.PLATFORM_URL = binding;
  await fetch(base + '//example.invalid/docs');
  assert.equal(received.url, '/internal/docs');
});
