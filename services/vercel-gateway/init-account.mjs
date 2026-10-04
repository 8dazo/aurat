import { randomBytes, scryptSync } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
const password = randomBytes(18).toString('base64url');
const salt = randomBytes(16).toString('hex');
mkdirSync('.aurat', { recursive: true, mode: 0o700 });
writeFileSync('.aurat/account.env', [
  'AURAT_LOGIN_USER=devansh',
  `AURAT_LOGIN_PASSWORD=${password}`,
  `AURAT_LOGIN_PASSWORD_HASH=${salt}:${scryptSync(password, salt, 64).toString('hex')}`,
  `AURAT_SESSION_SECRET=${randomBytes(32).toString('hex')}`,
  '',
].join('\n'), { flag: 'wx', mode: 0o600 });
console.log('Private sign-in credentials saved. Upload only the username, password hash and session secret to Vercel.');
