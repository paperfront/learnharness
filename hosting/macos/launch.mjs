import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const home = process.env.LH_SERVICE_HOME || join(homedir(), 'Services/LearnGraphHarness');
const config = JSON.parse(readFileSync(join(home, 'service.json'), 'utf8'));
const release = resolve(home, config.release);
const token = readFileSync(join(home, 'state/access-token'), 'utf8').trim();
if (!/^[a-f0-9]{64,128}$/.test(token)) throw new Error('Invalid service access token');
const env = { ...process.env, NODE_ENV: 'production', HOSTNAME: '127.0.0.1', PORT: String(config.port),
  LH_REMOTE_SERVER: '1', LH_REMOTE_API_TOKEN: token,
  LH_REMOTE_ALLOWED_ORIGINS: ['capacitor://localhost', ...(config.origin ? [config.origin] : [])].join(','),
  LH_DATA_DIR: join(home, 'state/data'), LH_AUTH_FILE: join(home, 'state/auth.json') };
delete env.LH_DESKTOP_SERVER; delete env.LH_DESKTOP_API_SECRET;
const child = spawn(process.execPath, [join(release, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(config.port)], {cwd: release, env, stdio: 'inherit'});
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => process.exit(code ?? 1));
