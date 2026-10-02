import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { preparePublic } from '../../platform/scripts/prepare-public.mjs';

const [command, ...args] = process.argv.slice(2);
if (!['build', 'dev'].includes(command)) throw new Error('Expected build or dev');
const root = fileURLToPath(new URL('../', import.meta.url));
preparePublic(root);
const result = spawnSync(process.execPath, [
  fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url)),
  command, '--webpack', ...args,
], { cwd: root, stdio: 'inherit', env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' } });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
