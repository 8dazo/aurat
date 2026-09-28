import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import http from 'node:http';
import { runSuite } from './runner.js';
import { validateSuite } from './suite.js';
import { RecordingStore } from './store.js';
import { redact } from './redact.js';
import { fingerprintRequest } from './fingerprint.js';
import { checkExecution } from './assertions.js';
import { buildContract, verifyContract } from './contracts.js';
const demo = JSON.parse(await readFile(new URL('../examples/ticket-agent/suite.json', import.meta.url)));
const root = resolve('examples/ticket-agent');
const sdk = new URL('./testing.js', import.meta.url).href;
async function run(scenario) {
  const dir = await mkdtemp(join(tmpdir(), 'aurat-test-'));
  try { const path = join(dir, 'suite.json'); await writeFile(path, JSON.stringify({ version: 1, scenarios: [scenario] })); return (await runSuite(path)).scenarios[0]; }
  finally { await rm(dir, { recursive: true, force: true }); }
}
function sample(flag) { return { ...structuredClone(demo.scenarios[0]), cwd: root, recordings: join(root, 'model.jsonl'), command: ['node', 'agent.mjs', ...(flag ? [flag] : [])] }; }
function inline(code, extra = {}) { return { id: 'inline', command: ['node', '--input-type=module', '-e', code], expect: { outputEquals: true }, ...extra }; }
test('candidate application executes with full fixture coverage', async () => { const r = await run(sample()); assert.equal(r.status, 'PASS'); assert.equal(r.coverage.tools.consumed, 1); });
for (const flag of ['--duplicate', '--wrong-args', '--bad-output']) test(`changed application ${flag} fails unchanged fixtures`, async () => { assert.notEqual((await run(sample(flag))).status, 'PASS'); });
test('unconsumed model and tool fixtures fail closed', async () => {
 const s = sample(); s.command = ['node', '--input-type=module', '-e', `import {reportOutput} from ${JSON.stringify(sdk)};reportOutput({ticketId:'T-42',status:'created'})`];
 const r = await run(s); assert.equal(r.status, 'INCOMPLETE'); assert.equal(r.coverage.model.consumed, 0);
});
test('crashed application cannot pass', async () => { assert.equal((await run(inline('process.exit(3)'))).status, 'FAIL'); });
test('hung application is terminated', async () => { assert.equal((await run(inline('setInterval(()=>{},1000)', {timeoutMs: 200}))).status, 'INFRA_ERROR'); });
test('missing fixture is infrastructure failure', async () => { assert.equal((await run(inline('void 0', {recordings: '/nonexistent/aurat-fixture'}))).status, 'INFRA_ERROR'); });
test('empty and duplicate scenarios are rejected', () => {
 assert.throws(() => validateSuite({version: 1, scenarios: []}));
 assert.throws(() => validateSuite({version: 1, scenarios: [sample(), sample()]}));
});
test('fetch and Node HTTP egress are blocked even if application catches errors', async () => {
 let hits = 0;
 const server = http.createServer((req,res)=>{ hits++; res.end('unexpected'); });
 await new Promise(r => server.listen(0,'127.0.0.1',r));
 const url = `http://127.0.0.1:${server.address().port}`;
 try {
  for (const request of [`await fetch(${JSON.stringify(url)}).catch(()=>{})`, `await new Promise(r=>http.get(${JSON.stringify(url)}).on('error',r))`]) {
   const r = await run(inline(`import http from 'node:http';import {reportOutput} from ${JSON.stringify(sdk)};${request};reportOutput(true)`));
   assert.equal(r.status, 'FAIL'); assert.ok(r.failures.some(f=>f.field==='network'));
  }
  assert.equal(hits, 0);
 } finally { await new Promise(r=>server.close(r)); }
});
test('provider credentials are not inherited', async () => {
 process.env.TEST_PROVIDER_SECRET = 'do-not-inherit';
 try { assert.equal((await run(inline(`import {reportOutput} from ${JSON.stringify(sdk)};reportOutput(process.env.TEST_PROVIDER_SECRET===undefined)`))).status, 'PASS'); }
 finally { delete process.env.TEST_PROVIDER_SECRET; }
});
test('occurrences replay 429 then 200 and exhaust, including concurrent reservations', async () => {
 const dir = await mkdtemp(join(tmpdir(),'aurat-store-test-'));
 try { const store = new RecordingStore(join(dir,'store.jsonl')); await store.append({fingerprint:'same',response:{status:429}}); await store.append({fingerprint:'same',response:{status:200}});
 const values = await Promise.all([store.consume('same'),store.consume('same'),store.consume('same')]);
 assert.deepEqual(values.map(v=>v?.response.status),[429,200,undefined]); assert.equal((await store.coverage()).consumed,2);
 } finally { await rm(dir,{recursive:true,force:true}); }
});
test('redaction is idempotent and fingerprints survive sanitization', () => {
 const body = {api_key:'secret-value',nested:{password:'pw'},text:'sk-abcdefghijklmnopqrstuv'};
 const safe=redact(body); assert.deepEqual(redact(safe),safe); assert.ok(!JSON.stringify(safe).includes('secret-value'));
 const request={method:'POST',path:'/v1/chat/completions',body}; assert.equal(fingerprintRequest(request),fingerprintRequest({...request,body:safe}));
});
test('nested schema types, argument values and action order are checked', () => {
 const events=[{type:'output',value:{ticket:{id:42}}},{type:'tool',name:'write',args:{amount:11}},{type:'tool',name:'read',args:{}}];
 const failures=checkExecution({outputSchema:{type:'object',properties:{ticket:{type:'object',properties:{id:{type:'string'}}}}},tools:[{name:'write',arguments:{amount:10}}],before:[['read','write']]},events);
 assert.equal(failures.length,3);
});
test('empty and extra recording sets never pass contracts', () => {
 assert.equal(verifyContract(buildContract([]),[]).ok,false);
 const item={fingerprint:'a',request:{body:{}},response:{status:200,headers:{},body:'{}'}};
 assert.equal(verifyContract(buildContract([item]),[item,{...item,fingerprint:'b'}]).ok,false);
});
test('caught replay misses still fail CI', async () => {
 const r=await run(inline(`import {reportOutput} from ${JSON.stringify(sdk)};await fetch(process.env.OPENAI_BASE_URL+'/chat/completions',{method:'POST',body:'{}'});reportOutput(true)`));
 assert.equal(r.status,'INCOMPLETE'); assert.ok(r.failures.some(f=>f.field==='replay'));
});
test('recorded tool errors execute application recovery', async () => {
 const r=await run(inline(`import {reportOutput,wrapTool} from ${JSON.stringify(sdk)};const tool=wrapTool('charge',()=>{throw Error('must not execute')});try{await tool({amount:10})}catch(e){reportOutput(e.message==='declined')}`,{tools:[{name:'charge',args:{amount:10},error:'declined'}]}));
 assert.equal(r.status,'PASS');
});
test('persistence redacts request keys, query secrets and SSE response secrets', async () => {
 const dir=await mkdtemp(join(tmpdir(),'aurat-redact-test-'));
 try {
  const path=join(dir,'store.jsonl');const store=new RecordingStore(path);
  const request={method:'POST',path:'/v1/chat/completions?api_key=query-secret',body:{password:'body-secret'}};
  await store.append({fingerprint:fingerprintRequest(request),request,response:{status:200,headers:{'set-cookie':'cookie-secret'},body:'data: {"secret":"response-secret"}\n\n'}});
  const text=await readFile(path,'utf8');for(const secret of ['query-secret','body-secret','cookie-secret','response-secret']) assert.ok(!text.includes(secret));
  const [saved]=await store.list();assert.equal(fingerprintRequest(request),fingerprintRequest(saved.request));
 }finally{await rm(dir,{recursive:true,force:true});}
});
