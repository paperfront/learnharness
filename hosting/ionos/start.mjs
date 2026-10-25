import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
const token = readFileSync('/state/access-token', 'utf8').trim();
if (!/^[a-f0-9]{64,128}$/.test(token)) throw new Error('Invalid server access token');
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '0.0.0.0', '--port', '4310'], {
  stdio: 'inherit', env: {...process.env, LH_REMOTE_SERVER: '1', LH_REMOTE_API_TOKEN: token,
    LH_DATA_DIR: '/state/data', LH_AUTH_FILE: '/state/auth.json'},
});
for (const signal of ['SIGTERM','SIGINT']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => process.exit(code ?? 1));
