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
# launchctl bootout waits for service teardown. All application state is here.
tar -czf "$archive" -C "$service_home" state service.json
chmod 600 "$archive"
printf '%s\n' "$archive"
