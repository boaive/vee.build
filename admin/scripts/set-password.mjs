#!/usr/bin/env node
/**
 * Sets the panel's one login: the owner's email and password.
 *
 *   npm run password:local    the database `wrangler dev` uses
 *   npm run password:remote   the live database on Cloudflare
 *
 * It asks for the email and the password (typed twice, not shown). It can
 * also read ADMIN_EMAIL and ADMIN_PASSWORD from the environment. The
 * password is hashed here (PBKDF2-SHA256, 100,000 rounds, as the Worker
 * checks it); only the hash goes to the database. Every signed-in device
 * is signed out.
 */
import { spawnSync } from 'node:child_process';
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const where = process.argv.includes('--remote') ? '--remote' : '--local';
const root = fileURLToPath(new URL('..', import.meta.url));
const ITERATIONS = 100_000;

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (s.includes(question)) rl.output.write(s);
        else if (s === '\r\n' || s === '\n') rl.output.write(s);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer);
    });
  });
}

const email = (process.env.ADMIN_EMAIL ?? (await ask('Owner email: '))).trim();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
  console.error('That is not an email address.');
  process.exit(1);
}
let password = process.env.ADMIN_PASSWORD;
if (!password) {
  password = await ask('New password (at least 12 characters): ', true);
  const again = await ask('The same password again: ', true);
  if (password !== again) {
    console.error('The two passwords are not the same. Nothing was changed.');
    process.exit(1);
  }
}
if (password.length < 12) {
  console.error('Use at least 12 characters. A short sentence is easy to remember and hard to guess.');
  process.exit(1);
}

const salt = randomBytes(16);
const hash = pbkdf2Sync(password.normalize('NFKC'), salt, ITERATIONS, 32, 'sha256');
const stored = `pbkdf2-sha256$${ITERATIONS}$${salt.toString('base64')}$${hash.toString('base64')}`;
const q = (s) => `'${s.replace(/'/g, "''")}'`;
const sql = `INSERT INTO admin (id, email, password_hash, password_changed_at) VALUES (1, ${q(email)}, ${q(stored)}, ${q(new Date().toISOString())})
ON CONFLICT (id) DO UPDATE SET email = excluded.email, password_hash = excluded.password_hash, password_changed_at = excluded.password_changed_at;
DELETE FROM sessions;
INSERT INTO activity (at, action, detail) VALUES (${q(new Date().toISOString())}, 'Password set', 'From the command line');
`;

const file = join(tmpdir(), `vee-admin-${randomBytes(6).toString('hex')}.sql`);
writeFileSync(file, sql, { mode: 0o600 });
try {
  const wrangler = join(dirname(createRequire(import.meta.url).resolve('wrangler/package.json')), 'bin', 'wrangler.js');
  const r = spawnSync(process.execPath, [wrangler, 'd1', 'execute', 'vee', where, '--file', file, '--yes'], { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
  console.log(`\nDone. Sign in at /admin with ${email}${where === '--local' ? ' (local database)' : ''}.`);
} finally {
  rmSync(file, { force: true });
}
