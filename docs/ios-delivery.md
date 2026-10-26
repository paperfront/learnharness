# iOS build and TestFlight delivery

Confirmed app identity: **LearnGraphHarness**, bundle ID `com.paperfront.learnharness`.

The shared React client is bundled locally in Capacitor. It connects to a separately
running learning server; it does not package Node, Next.js, model credentials, or
learning records. See `remote-server.md` for server setup.

## Pipeline

`.github/workflows/ios-testflight.yml` runs type checking, tests, lint, the static
client build, and an unsigned iOS Simulator build. Pull requests do not receive
Apple credentials or upload anything. A manual workflow dispatch can additionally
archive, export and upload the signed app. Apple processing and tester availability
must be checked separately after upload.

This follows the successful `paperfront/poker_settle` workflow: Xcode automatic
signing with an App Store Connect API key, then `altool` upload. No private key or
provisioning profile is committed. Existing signing assets are left untouched;
if Apple reports certificate limits, investigate rather than revoke automatically.

## Required account configuration

Before the first upload, register the owner's agreed bundle ID and create its iOS
app record in App Store Connect. Set repository variable `IOS_BUNDLE_ID` to that
registered identifier. Do not ship the unsigned-build placeholder identifier.

Use the same secret names as Poker Settle:

- `APPLE_TEAM_ID`
- `ASC_KEY_ID`
- `ASC_ISSUER_ID`
- `ASC_PRIVATE_KEY` (complete `.p8` contents)

The API key needs permission to provision/sign and upload for the selected team.
GitHub cannot reveal existing repository secret values; obtain the original key
through the owner's existing secure setup, or configure access to an organization
secret. Never put credentials in board cards, chat messages, logs, or source.

```sh
gh workflow run ios-testflight.yml --repo paperfront/learnharness -f upload_testflight=true
gh run list --repo paperfront/learnharness --workflow ios-testflight.yml
```

The workflow uses Node 26 and Xcode 26 or newer. Version comes from `package.json`;
build number combines workflow run number and attempt so reruns do not reuse it.
The IPA is retained for 14 days. The temporary API key is removed in an always-run
cleanup step. Internal tester assignment and any Apple compliance questions remain
App Store Connect configuration, not proof supplied by a successful upload command.

## Validation status

Signed archive, IPA export, and TestFlight upload succeeded on 2026-10-25 for
LearnGraphHarness 0.3.7 (build 3.1), commit 919f52e:
https://github.com/paperfront/learnharness/actions/runs/40240932935 .
Apple processing and tester availability have not yet been verified.
Actual iPhone checks must cover keyboard/safe area,
lesson text/math, quiz submission, interactive demo, graph gestures, reconnect after
backgrounding, and switching servers without retaining the prior server's data.

## References

- Working reference: https://github.com/paperfront/poker_settle/blob/main/.github/workflows/ios-testflight.yml
- Capacitor iOS: https://capacitorjs.com/docs/ios
- Apple uploads: https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds

Local validation: type checking, lint, and the static client build pass. Browser
checks at 390 × 844 verified connection rejection, successful connection, sidebar
navigation, and disconnect against an isolated server. HTTP checks verified 401
for missing/invalid tokens, 403 for unapproved origins, and 204 for native CORS
preflight. Native device behavior remains to be verified through the iOS build.

## Remembered server connection

iOS saves the server URL and token as one versioned record using the system
Keychain through @aparajita/capacitor-secure-storage 8.0.1. Access is limited to
when the device is unlocked, with ThisDeviceOnly protection and no iCloud sync.
Web builds never invoke the plugin's localStorage fallback.

After updating from a memory-only build, connect once to save the credentials.
Force quit and reopen to verify restoration. Disconnect deletes the record;
reopening after disconnect must show the connection form. Network failure keeps
the credentials; Keychain failure shows a retryable error. Test these on an iPhone
before claiming device verification. Keychain entries can survive uninstall; use
Disconnect to explicitly forget this server.

The generated Info.plist carries forward the owner's existing declaration of no
non-exempt encryption (`ITSAppUsesNonExemptEncryption=false`). iOS networking and
credential storage use Apple's HTTPS/Keychain services; reassess this metadata if
custom cryptography is added. This avoids a fresh missing-compliance prompt on
every otherwise equivalent upload.
