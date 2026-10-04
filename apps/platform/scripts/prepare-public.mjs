import {cpSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
// One explicit public-source allowlist for Render and Vercel. Trusted auth,
// API routes, database bindings, and environment files never enter the export.
export function preparePublic(target) {
  for(const dir of ['app','components','hooks','lib','public']) {
    rmSync(path.join(target,dir),{recursive:true,force:true});
  }
  mkdirSync(target,{recursive:true});
  for(const dir of ['components','hooks','public'])cpSync(path.join(root,dir),path.join(target,dir),{recursive:true});
  mkdirSync(path.join(target,'lib'));
  for(const file of ['data.ts','utils.ts','before.json','after.json'])cpSync(path.join(root,'lib',file),path.join(target,'lib',file));
  mkdirSync(path.join(target,'app/docs'),{recursive:true});
  for(const file of ['layout.tsx','page.tsx','globals.css','workspace.css','docs/page.tsx'])cpSync(path.join(root,'app',file),path.join(target,'app',file));
  cpSync(path.join(root,'postcss.config.mjs'),path.join(target,'postcss.config.mjs'));
  const tsconfig=JSON.parse(readFileSync(path.join(root,'tsconfig.json'),'utf8'));
  tsconfig.compilerOptions.types=['node'];
  writeFileSync(path.join(target,'tsconfig.json'),JSON.stringify(tsconfig));

  // A public copy must not suggest that ChatGPT's trusted-header auth works here.
  const dashboard=path.join(target,'components/dashboard.tsx');
  let source=readFileSync(dashboard,'utf8');
  source=source.replace('/signin-with-chatgpt?return_to=%2Fapp','/signin/')
    .replace('Sign in to connect','Sign in')
    .replace('Real Scout reproduction. Changes here are read-only.','Example data · Sign in to open your saved workspace.')
    .replace('Example workspace · sign in to save your own data','Example workspace · sign in to save');
  source=source.replace('Workspace v0.3', 'Workspace v0.3 · ' + (process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,7) ?? 'local'));
  writeFileSync(dashboard,source);
  mkdirSync(path.join(target,'app/signin'),{recursive:true});
  writeFileSync(path.join(target,'app/signin/page.tsx'), `import SignIn from '@/components/sign-in';\nexport default function Page(){return <SignIn/>;}\n`);
  const routes=['app','app/projects','app/runs','app/scenarios','app/fixtures','app/connections','app/settings','app/runs/scout-original','app/runs/scout-fixed'];
  for(const route of routes){
    mkdirSync(path.join(target,'app',route),{recursive:true});
    writeFileSync(path.join(target,'app',route,'page.tsx'),`import {Suspense} from 'react';\nimport Dashboard from '@/components/dashboard';\nexport default function Page(){return <Suspense fallback={<p>Loading example workspace…</p>}><Dashboard user={null}/></Suspense>;}\n`);
  }
}
