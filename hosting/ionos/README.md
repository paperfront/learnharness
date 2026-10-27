# IONOS deployment and migration

The application runs in Docker at `/opt/learngraphharness`, with only
`127.0.0.1:9431` published. Tailscale Serve maps private HTTPS port 9443 to that
loopback port. Existing ports 443 and 8443 belong to other applications.

The source is in `source/`; `compose.yaml` and `backup.sh` are copied from this
directory to the deployment root. Build with `docker compose build`, then start
with `docker compose up -d`. The image runs as UID 1000 with an init process;
`state/` must be owned by UID 1000 and private. The token is read from a file at
runtime and is never embedded in the image or Compose environment.

All persistent learning records, model settings, provider keys, and the access
token live in `state/`. `state/access-token` is the client token, distinct from
model provider API keys. Keep archives and credentials out of Git and logs.

## Backup

Run `bash /opt/learngraphharness/backup.sh`. It stops this server, snapshots
`state/` and `compose.yaml`, and restarts it. Archives are mode 0600 in `backups/`.
Store a private off-host copy for disaster recovery; same-host backups alone do
not protect against loss of IONOS.

## Move to a new Mac mini

1. Prepare the destination runtime/source using `../macos/README.md`. Build for
   the destination's processor; never copy Linux binaries or node_modules.
2. Stop IONOS with `docker compose stop server`. Run backup.sh while it is stopped;
   the script leaves an already-stopped server stopped, producing the final
   migration snapshot. Allow no further writes on IONOS after this point.
3. Transfer the archive privately over SSH and restore only `state/` into
   `~/Services/LearnGraphHarness` on the Mac. Fix ownership to that Mac's user,
   keep state mode 0700 and credentials mode 0600. Keep the old copy for rollback.
4. Register the Mac LaunchAgent. It preserves the restored access token. Set its
   HTTPS origin and validate authentication, sessions, and provider settings.
5. Either connect directly using the Mac's own private HTTPS address (update the
   app URL), or retain the IONOS URL using a dedicated restricted SSH reverse
   tunnel from the Mac to IONOS loopback port 9431. The tunnel is a future cutover
   step, not configured by this deployment. Keep IONOS's Docker server stopped
   when the tunnel uses its former port. Never run two writers on the same data.

The iPhone requires Tailscale connected to the owner's tailnet. HTTPS forwarding
must preserve Authorization/Origin and streaming responses. Provider credentials
can be added through the authenticated app after connection.
