import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createServer as createSecureServer } from 'node:https';
import { readFile, mkdtemp, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { scryptSync } from 'node:crypto';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import gateway from '../services/vercel-gateway/index.mjs';
import { WorkspaceStore } from '../src/platform/storage.js';
import { PlatformService } from '../src/platform/service.js';
import { handler } from '../src/platform/http.js';

const require = createRequire(path.join(process.env.AURAT_PLAYWRIGHT_DIR, 'package.json'));
const { chromium } = require('playwright');
const temp = await mkdtemp(path.join(tmpdir(), 'aurat-ui-'));
const out = path.resolve('apps/vercel-platform/out');
const screenshots = path.resolve('.aurat/ui-verification');
await mkdir(screenshots, { recursive: true });
const store = new WorkspaceStore(':memory:');
let apiHandler, browser, page;
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.txt':'text/x-component', '.json':'application/json', '.webp':'image/webp', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon' };
const frontend = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const file = path.resolve(out, '.' + url.pathname + (url.pathname.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(out + path.sep)) throw Error('path');
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type':types[path.extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(0, '127.0.0.1');
const backend = createServer((req, res) => apiHandler(req, res)).listen(0, '127.0.0.1');
await Promise.all([once(frontend,'listening'),once(backend,'listening')]);
const salt = 'a'.repeat(32);
Object.assign(process.env, {
  AURAT_LOGIN_USER:'ui-owner',
  AURAT_LOGIN_PASSWORD_HASH:salt + ':' + scryptSync('synthetic-test-password',salt,64).toString('hex'),
  AURAT_SESSION_SECRET:'s'.repeat(64), AURAT_WORKSPACE_TOKEN:'t'.repeat(64),
  PLATFORM_URL:'http://127.0.0.1:' + frontend.address().port,
  WORKSPACE_URL:'http://127.0.0.1:' + backend.address().port,
});
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',path.join(temp,'key.pem'),'-out',path.join(temp,'cert.pem'),'-days','1','-subj','/CN=localhost'],{stdio:'ignore'});
const server = createSecureServer({key:await readFile(path.join(temp,'key.pem')),cert:await readFile(path.join(temp,'cert.pem'))},gateway).listen(0,'127.0.0.1');
await once(server,'listening');
const base = 'https://127.0.0.1:' + server.address().port;
process.env.AURAT_ALLOWED_ORIGINS = base;
apiHandler = handler(new PlatformService(store), {token:process.env.AURAT_WORKSPACE_TOKEN,allowedOrigins:[base]});
const errors = [];
try {
  browser = await chromium.launch({headless:true});
  const context = await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000}});
  page = await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.setDefaultTimeout(15000);
  await page.goto(base + '/app/');
  await page.getByRole('heading',{name:'Welcome back.',exact:true}).waitFor();
  await page.getByLabel('Username',{exact:true}).fill('ui-owner');
  await page.getByLabel('Password',{exact:true}).fill('synthetic-test-password');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByRole('heading',{name:'Overview',exact:true}).waitFor();
  await page.getByText('Private workspace',{exact:true}).first().waitFor();
  await page.getByRole('button',{name:'Create project',exact:true}).first().click();
  const dialog = page.getByRole('dialog',{name:'Create a project'});
  await dialog.getByLabel('Project name').fill('UI regression project');
  await dialog.getByLabel('GitHub repository').fill('https://github.com/8dazo/aurat');
  await dialog.getByRole('button',{name:'Create project',exact:true}).click();
  await dialog.waitFor({state:'hidden'});
  for (const [label,title] of [['Projects','Projects'],['Runs','Runs'],['Scenarios','Scenarios'],['Fixture coverage','Fixture coverage'],['Connections','Connections'],['Settings','Settings'],['Overview','Overview']]) {
    await page.locator('[data-sidebar="menu-button"]').filter({hasText:label}).click();
    await page.getByRole('heading',{name:title,exact:true}).waitFor();
  }
  for (const width of [1440,820,390]) {
    await page.setViewportSize({width,height:1000});
    await page.goto(base + '/app/connections/');
    await page.getByText('Workspace database · connected',{exact:true}).waitFor();
    assert.equal(await page.getByLabel('API URL',{exact:true}).count(),0);
    assert.equal(await page.getByLabel('Workspace token',{exact:true}).count(),0);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth + 1), 'Horizontal overflow at ' + width);
    assert.equal(await page.getByRole('heading',{name:'Connections',exact:true}).count(),1);
    await page.screenshot({path:path.join(screenshots,`connections-${width}.png`),fullPage:true});
    if (width === 390) {
      const toggle = page.getByRole('button',{name:'Toggle Sidebar',exact:true});
      await toggle.click();
      await page.locator('[data-mobile="true"]').waitFor({state:'visible'});
      await page.locator('[data-mobile="true"] a').filter({hasText:'Runs'}).click();
      await page.getByRole('heading',{name:'Runs',exact:true}).waitFor();
      await page.locator('[data-mobile="true"]').waitFor({state:'hidden'});
      await page.getByRole('button',{name:'Import report',exact:true}).first().click();
      await page.getByRole('dialog',{name:'Import a report'}).waitFor();
      await page.keyboard.press('Escape');
    }
  }
  await page.goto(base + '/app/connections/');
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await page.getByRole('heading',{name:'Welcome back.',exact:true}).waitFor();
  await page.goto(base + '/app/');
  await page.getByRole('heading',{name:'Welcome back.',exact:true}).waitFor();
  assert.deepEqual(errors,[], 'Client errors');
  console.log('PASS: sign-in, automatic API connection, project creation, seven navigation routes, reload persistence, three viewport sizes, mobile sidebar and sign-out.');
} catch (error) {
  if (page) await page.screenshot({path:path.join(screenshots,'failure.png'),fullPage:true}).catch(()=>{});
  console.error(error);
  console.error('Client errors:',errors);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await Promise.all([frontend,backend,server].map(s=>new Promise(resolve=>s.close(resolve))));
  store.close();
  await rm(temp,{recursive:true,force:true});
}
