#!/bin/bash
# Stop the single writer before copying JSON/JSONL files and credentials.
set -euo pipefail
umask 077
service_home="${LH_SERVICE_HOME:-$HOME/Services/LearnGraphHarness}"
label=com.paperfront.learngraphharness.server
domain="gui/$(id -u)"
plist="$HOME/Library/LaunchAgents/$label.plist"
mkdir -p "$service_home/backups"
archive="$service_home/backups/learngraphharness-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
restart=0
if launchctl print "$domain/$label" >/dev/null 2>&1; then
  launchctl bootout "$domain/$label"
  restart=1
fi
trap 'if [ "$restart" = 1 ]; then launchctl bootstrap "$domain" "$plist"; fi' EXIT
# Wait for the old listener to stop before reading mutable files.
python3 - "$service_home/service.json" <<'PYTHON'
import json, socket, sys, time
port = json.load(open(sys.argv[1]))['port']
for attempt in range(60):
    try:
        with socket.create_connection(('127.0.0.1', port), timeout=1):
            pass
    except OSError:
        break
    time.sleep(0.5)
else:
    raise SystemExit('Server still listening; backup aborted to avoid an inconsistent snapshot')
PYTHON
tar -czf "$archive" -C "$service_home" state service.json
chmod 600 "$archive"
printf '%s\n' "$archive"
