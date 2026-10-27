# Mac mini server and migration

Application: LearnGraphHarness (`com.paperfront.learnharness`). The server runs as
`com.paperfront.learngraphharness.server` in the signed-in user's LaunchAgent domain.
It starts on login and restarts after failure. The Mac must remain awake and the
user must be logged in. HTTPS access uses the Mac's Tailscale address and requires
the iPhone to be signed in to the same tailnet.

## Files

Everything needed by the service is under `~/Services/LearnGraphHarness`:

- `state/data/`: sessions, knowledge graph, settings, and model caches.
- `state/auth.json`: provider credentials, when configured through the app.
- `state/access-token`: private client access token; preserve it during migration.
- `service.json`: release, loopback port, and HTTPS origin (no token).
- `releases/<revision>/`: source, locked dependencies and production build.
- `runtime/`: architecture-specific Node 26 runtime verified against Node's SHA256 list.
- `launch.mjs`, `backup.sh`: portable service and backup scripts from this directory.
- `logs/`: private operational logs. `backups/`: private migration snapshots.

The server binds only to 127.0.0.1:4310; HTTPS is provided separately by Tailscale.
Do not expose port 4310 directly. The access token grants full single-user API access.
Provider keys are separate and can be configured after connecting the app.

## Install or restore on a Mac

1. Install/sign in to Tailscale using the existing tailnet account. Install Chrome
   if browser-backed learning tools are needed.
2. Create `~/Services/LearnGraphHarness` with mode 0700. Install a Node 26 runtime
   for the destination architecture (`darwin-arm64` for Apple Silicon,
   `darwin-x64` for Intel), verifying the archive against the official SHA256 list.
3. Extract the selected Git revision into `releases/<revision>/`. With the runtime's
   `bin` on PATH, run `npm ci` and `npm run build` there. Do not copy node_modules,
   `.next`, or the old Node binary across processor architectures.
4. For migration, restore the private snapshot's `state/` and `service.json` into
   the service directory BEFORE registering/starting. Never overwrite an active
   destination's state. Keep the original snapshot until validation is complete.
5. Copy `launch.mjs`, `backup.sh` from this directory to the service directory.
   Run `python3 hosting/macos/register.py <absolute-node-path> releases/<revision>`
   from this repository. Registration preserves an existing token and updates
   the generated LaunchAgent paths for the new user/runtime.
6. Set `origin` in `service.json` to the destination's HTTPS origin, configure an
   unused Tailscale Serve HTTPS port to proxy to `http://127.0.0.1:4310`, and start:

   ```sh
   launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.paperfront.learngraphharness.server.plist"
   ```

7. Verify missing/wrong token returns 401, valid token returns settings, native
   preflight works, and the iPhone connects. Update only the server URL on the
   iPhone if its hostname changes; the restored access token stays the same.

## Make the migration snapshot

Run `bash ~/Services/LearnGraphHarness/backup.sh` on the old Mac. It stops this
service before archiving `state/` and `service.json`, then restarts it. The archive
contains credentials: transfer it only over SSH or another private channel.

For the FINAL migration snapshot, first stop the old service manually using the
command below, then run backup.sh. Since it was already stopped, the backup script
will leave it stopped. Do not allow new learning sessions on the old server after
this snapshot. Restore on the new Mac, validate, and keep the old copy as rollback.
Never run both machines against the same state folder.

```sh
launchctl bootout "gui/$(id -u)/com.paperfront.learngraphharness.server"
```

A backup on the same Mac is not disaster protection. Copy the final migration
snapshot off that Mac before erasing or replacing it.
