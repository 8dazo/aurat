import {mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {preparePublic} from './prepare-public.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const target=path.join(root,'.render-build');
rmSync(target,{recursive:true,force:true});
mkdirSync(target,{recursive:true});
preparePublic(target);
const pkg=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
writeFileSync(path.join(target,'package.json'),JSON.stringify({name:'aurat-render-public',private:true,type:'module',dependencies:pkg.dependencies,devDependencies:pkg.devDependencies}));
writeFileSync(path.join(target,'next.config.mjs'),`export default {output:'export',trailingSlash:true,images:{unoptimized:true},experimental:{cpus:2},webpack(config){return config;}};\n`);
const result=spawnSync(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'build','--webpack'],{cwd:target,stdio:'inherit',env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'}});
if(result.error)throw result.error;
process.exit(result.status??1);
