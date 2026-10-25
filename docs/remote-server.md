# Remote LearnHarness server

The bundled iOS client connects to a long-running server over HTTPS. No deployment
is performed by adding this configuration.

## Configuration

- `LH_REMOTE_SERVER=1`
- `LH_REMOTE_API_TOKEN`: 64–128 hexadecimal characters generated cryptographically, e.g. `openssl rand -hex 32`.
- `LH_REMOTE_ALLOWED_ORIGINS`: exact comma-separated origins, e.g. `capacitor://localhost,https://learn.example`. Include the web client's own origin. HTTP loopback origins are allowed explicitly for local development only.
- `LH_DATA_DIR`: absolute persistent private data directory.
- `LH_AUTH_FILE`: absolute private provider-credential file.

Do not set desktop-mode variables. Partial remote configuration fails closed.
The access token grants full single-user API access, including provider settings
and AI operations. It is separate from provider API keys. Rotate it and restart
the server to revoke access and close old streams; individual-device revocation
is not implemented. Never put tokens in Git, URLs, build variables, logs or cards.

Clients send `Authorization: Bearer <token>`. Authenticated `GET /api/settings`
validates a connection. Cookie, query-string and desktop-header tokens are rejected.
The client currently retains the token in memory only, requiring reconnection after
a full app restart. Persistent iOS Keychain storage is not yet implemented.

## Running

Use Node 26, `npm ci`, `npm run build`, then
`npm start -- --hostname 127.0.0.1 --port 3000` under a service supervisor with the
above environment. Terminate HTTPS at a reverse proxy on a stable hostname.
Preserve Authorization and Origin, disable SSE buffering and allow long streams.
Run one process per data directory: active turns/events are process-local and
JSON/JSONL storage is not a multi-worker database. A restart interrupts active work.
Back up records and provider credentials privately. Subscription-provider sign-in
still depends on Electron; standalone remote deployments use server API keys.

Public pages are shells without chat/settings records. They fetch through protected
APIs. Verify HTML/RSC responses do not leak records before any deployment.
CORS supplements authentication; clients without Origin still need a bearer token.

## Validation

Run `npm run typecheck`, `npm test`, `npm run lint`, and `npm run mobile:build`.
Verify authenticated and unauthenticated API requests, origin rejection, preflight,
SSE reconnection, and foreground/resume on the actual iPhone before calling the
mobile experience fully validated. Provider-backed learning needs a configured
server; deterministic tests use simulated engines and no paid model calls.
