#!/bin/bash
set -euo pipefail
umask 077
cd "${LH_SERVICE_HOME:-/opt/learngraphharness}"
mkdir -p backups
restart=0
if [ -n "$(docker compose ps --status running -q server)" ]; then
  docker compose stop -t 60 server
  restart=1
fi
trap 'if [ "$restart" = 1 ]; then docker compose start server; fi' EXIT
archive="backups/learngraphharness-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
tar -czf "$archive" state compose.yaml
chmod 600 "$archive"
printf '%s\n' "$PWD/$archive"
