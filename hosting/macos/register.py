#!/usr/bin/env python3
"""Register a user LaunchAgent; preserve existing/restored state and token."""
import json, os, plistlib, secrets, sys
from pathlib import Path
home = Path.home() / 'Services/LearnGraphHarness'
node = Path(sys.argv[1]).resolve()
release = sys.argv[2]
if not node.is_file() or not (home / release / '.next/BUILD_ID').is_file():
    raise SystemExit('Node runtime or production build missing')
os.umask(0o077)
for name in ('state/data', 'logs', 'backups'):
    (home / name).mkdir(parents=True, exist_ok=True)
(home / 'state').chmod(0o700)
token = home / 'state/access-token'
if not token.exists():
    token.write_text(secrets.token_hex(32) + '\n')
token.chmod(0o600)
config_path = home / 'service.json'
config = json.loads(config_path.read_text()) if config_path.exists() else {'port': 4310, 'origin': ''}
config['release'] = release
config_path.write_text(json.dumps(config, indent=2) + '\n')
config_path.chmod(0o600)
label = 'com.paperfront.learngraphharness.server'
plist = Path.home() / 'Library/LaunchAgents' / (label + '.plist')
plist.parent.mkdir(parents=True, exist_ok=True)
plist.write_bytes(plistlib.dumps({
    'Label': label, 'ProgramArguments': [str(node), str(home / 'launch.mjs')],
    'WorkingDirectory': str(home), 'RunAtLoad': True, 'KeepAlive': True,
    'ThrottleInterval': 10,
    'EnvironmentVariables': {'LH_SERVICE_HOME': str(home), 'PATH': str(node.parent) + ':/usr/bin:/bin:/usr/sbin:/sbin'},
    'StandardOutPath': str(home / 'logs/server.log'),
    'StandardErrorPath': str(home / 'logs/server-error.log'),
}))
plist.chmod(0o600)
print('Registered ' + str(plist))
