import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import ts from 'typescript';
// Exercise the actual route/query/validation code with SQLite, substituting only
// platform identity and the D1 transport. No deployed identities or data used.
const root=new URL('../',import.meta.url);const scratch=new URL('.test-build/',root);mkdirSync(scratch,{recursive:true});
function compile(from,to,replace={}){let src=readFileSync(new URL(from,root),'utf8');for(const [a,b] of Object.entries(replace))src=src.replace(a,b);writeFileSync(new URL(to,scratch),ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);}
const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('drizzle/0000_careful_daimon_hellstrom.sql',root),'utf8'));
const DB = {
  prepare(sql) {
    return {
      bind(...args) {
        return {
          async run() { return sqlite.prepare(sql).run(...args); },
          async first() { return sqlite.prepare(sql).get(...args) ?? null; },
          async all() { return { results: sqlite.prepare(sql).all(...args) }; }
        };
      }
    };
  }
};
globalThis.__auratTest={user:null,env:{DB}};
compile('lib/reports.ts','reports.mjs');
compile('lib/db.ts','db.mjs',{"import {env} from 'cloudflare:workers';":"const env=globalThis.__auratTest.env;"});
compile('app/api/workspace/route.ts','route.mjs',{"import {getChatGPTUser} from '../../chatgpt-auth';":"const getChatGPTUser=async()=>globalThis.__auratTest.user;","'@/lib/db'":"'./db.mjs'","'@/lib/reports'":"'./reports.mjs'"});
const {GET,POST}=await import(new URL('route.mjs',scratch));
const owner=id=>{globalThis.__auratTest.user=id?{userId:id,email:id+'@test.invalid'}:null};
const post=(value,options={})=>POST(new Request('https://workspace.test/api/workspace',{method:'POST',headers:{'content-type':'application/json',origin:'https://workspace.test',...options.headers},body:typeof value==='string'?value:JSON.stringify(value)}));
const before=JSON.parse(readFileSync(new URL('lib/before.json',root)));const afterReport=JSON.parse(readFileSync(new URL('lib/after.json',root)));let projectId,runId,failedId;
test('anonymous workspace access is rejected',async()=>{owner(null);assert.equal((await GET()).status,401);assert.equal((await post({action:'project'})).status,401)});
test('origin, content type, invalid JSON, unknown actions and size are rejected',async()=>{owner('alice');assert.equal((await post({}, {headers:{origin:'https://evil.test'}})).status,403);assert.equal((await post({}, {headers:{'content-type':'text/plain'}})).status,415);assert.equal((await post('{')).status,400);assert.equal((await post({action:'unknown'})).status,400);assert.equal((await post('x'.repeat(1048577))).status,413)});
test('projects require a real GitHub repository URL',async()=>{assert.equal((await post({action:'project',name:'Scout',repository:'javascript:alert(1)'})).status,400);const r=await post({action:'project',name:'Scout',repository:'https://github.com/8dazo/scout'});assert.equal(r.status,201);projectId=(await r.json()).id;assert.equal((await (await GET()).json()).projects.length,1)});
test('contradictory and duplicate reports are rejected',async()=>{const contradictory=structuredClone(before);contradictory.ok=true;assert.equal((await post({action:'import',projectId,label:'bad',report:contradictory})).status,400);const duplicate=structuredClone(afterReport);duplicate.scenarios.push(duplicate.scenarios[0]);assert.equal((await post({action:'import',projectId,label:'bad',report:duplicate})).status,400)});
test('real before/after reports persist and sensitive events are redacted',async()=>{let r=await post({action:'import',projectId,label:'Original',report:before});assert.equal(r.status,201);failedId=(await r.json()).id;const report=structuredClone(afterReport);report.scenarios[0].events=[{authorization:'Bearer private-token',content:'sk-123456789012345678901234'}];r=await post({action:'import',projectId,label:'Fixed',report});assert.equal(r.status,201);runId=(await r.json()).id;const data=await (await GET()).json();assert.equal(data.runs.length,2);const event=data.runs.find(r=>r.id===runId).report.scenarios[0].events[0];assert.equal(event.authorization,'[redacted]');assert.equal(event.content,'[redacted]')});
test('a failing baseline is rejected; a passing baseline persists',async()=>{assert.equal((await post({action:'baseline',runId:failedId})).status,400);assert.equal((await post({action:'baseline',runId})).status,200);assert.equal((await (await GET()).json()).projects[0].baselineId,runId)});
test('another owner cannot read, import to, or change this workspace',async()=>{owner('bob');assert.deepEqual(await (await GET()).json(),{projects:[],runs:[]});assert.equal((await post({action:'import',projectId,label:'Foreign',report:afterReport})).status,404);assert.equal((await post({action:'baseline',runId})).status,404);owner('alice');assert.equal((await (await GET()).json()).runs.length,2)});
after(()=>{sqlite.close();rmSync(scratch,{recursive:true,force:true});delete globalThis.__auratTest});
