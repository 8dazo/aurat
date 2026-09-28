import {env} from 'cloudflare:workers';
import type {Workspace} from './data';
export function db(){const binding=(env as unknown as {DB:D1Database}).DB;if(!binding)throw new Error('Workspace storage is unavailable');return binding;}
export async function workspace(owner:string):Promise<Workspace>{const [p,r]=await Promise.all([db().prepare('SELECT id,name,repository,baseline_id AS baselineId,created_at AS createdAt FROM projects WHERE owner = ? ORDER BY created_at DESC').bind(owner).all(),db().prepare('SELECT id,project_id AS projectId,label,report,created_at AS createdAt FROM runs WHERE owner = ? ORDER BY created_at DESC LIMIT 100').bind(owner).all()]);return {projects:p.results as any,runs:r.results.map((row:any)=>({...row,report:JSON.parse(row.report)}))};}
