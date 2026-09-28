import {cpSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

// Build the public frontend only. Never copy APIs, trusted identity helpers,
// bindings, environment files, or user data into the public export.
const root=fileURLToPath(new URL('../',import.meta.url));
const target=path.join(root,'.render-build');
const workspace='https://aurat-workspace.d3c1.chatgpt.site/app';
rmSync(target,{recursive:true,force:true});
mkdirSync(target,{recursive:true});
for(const dir of ['components','hooks','public'])cpSync(path.join(root,dir),path.join(target,dir),{recursive:true});
mkdirSync(path.join(target,'lib'));
for(const file of ['data.ts','utils.ts','before.json','after.json'])cpSync(path.join(root,'lib',file),path.join(target,'lib',file));
mkdirSync(path.join(target,'app/docs'),{recursive:true});
for(const file of ['layout.tsx','page.tsx','globals.css','docs/page.tsx'])cpSync(path.join(root,'app',file),path.join(target,'app',file));
cpSync(path.join(root,'postcss.config.mjs'),path.join(target,'postcss.config.mjs'));
const pkg=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
writeFileSync(path.join(target,'package.json'),JSON.stringify({name:'aurat-render-public',private:true,type:'module',dependencies:pkg.dependencies,devDependencies:pkg.devDependencies}));
writeFileSync(path.join(target,'next.config.mjs'),`export default {output:'export',trailingSlash:true,images:{unoptimized:true},experimental:{cpus:2},webpack(config){return config;}};\n`);
const tsconfig=JSON.parse(readFileSync(path.join(root,'tsconfig.json'),'utf8'));
tsconfig.compilerOptions.types=['node'];
writeFileSync(path.join(target,'tsconfig.json'),JSON.stringify(tsconfig));

// A public copy must not suggest that ChatGPT's trusted-header auth works here.
const dashboard=path.join(target,'components/dashboard.tsx');
let source=readFileSync(dashboard,'utf8');
source=source.replace('/signin-with-chatgpt?return_to=%2Fapp',workspace)
  .replace('Sign in to connect','Open private workspace')
  .replace('Real Scout reproduction. Changes here are read-only.','Public demo · read-only. Saved projects remain in the private workspace.');
writeFileSync(dashboard,source);
for(const relative of ['components/landing.tsx','app/docs/page.tsx']){
  const file=path.join(target,relative);
  writeFileSync(file,readFileSync(file,'utf8').replaceAll('href="/app"',`href="${workspace}"`));
}
const routes=['app','app/projects','app/runs','app/scenarios','app/fixtures','app/connections','app/settings','app/runs/scout-original','app/runs/scout-fixed'];
for(const route of routes){
  mkdirSync(path.join(target,'app',route),{recursive:true});
  writeFileSync(path.join(target,'app',route,'page.tsx'),`import {Suspense} from 'react';\nimport Dashboard from '@/components/dashboard';\nexport default function Page(){return <Suspense fallback={<p>Loading example workspace…</p>}><Dashboard user={null}/></Suspense>;}\n`);
}
const result=spawnSync(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'build','--webpack'],{cwd:target,stdio:'inherit',env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'}});
if(result.error)throw result.error;
process.exit(result.status??1);
