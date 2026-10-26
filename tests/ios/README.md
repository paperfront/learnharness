# iOS runtime regression gate

`ios-testflight.yml` requires both the browser behavior job and `native-smoke`
before the production simulator build or an authorized TestFlight upload.

CI's separate `browser-smoke` job runs in the official Playwright 1.58.2 Noble
image, pinned by manifest digest and matched to the npm dependency. The image
already contains both browser engines and their OS libraries; CI does not fetch
browser archives from the Playwright CDN. `setup-node` selects Node 26 inside the
container. Unit/type/lint/build checks retain their ordinary Ubuntu job. Both
browser engines remain required release gates, each with a five-minute timeout.

The browser suite uses pinned Playwright Chromium **and WebKit**, real shared
React components, synthetic API responses, mobile touch contexts, payload
assertions, failure/retry checks and visible assistant continuation. Run with
Node 26:

```sh
npm ci
npx playwright install chromium webkit
npm run test:mobile
LH_BROWSER=webkit npm run test:mobile
```

`LH_FIXTURE_PORT` selects another local port (default 4317). The command owns and
cleans up its Vite server; an occupied port fails instead of testing stale code.
`LH_BROWSER_CHANNEL=chrome` permits local installed Chrome. Browser viewport
resizing tests layout under simulated available space; it does not test an iOS
keyboard.

## Native simulator run

Use a **disposable checkout** with current Xcode, an installed iPhone simulator,
Node 26, Ruby and `gem install xcodeproj -v 1.27.0 --no-document`. Then:

```sh
npm ci
bash tests/ios/run.sh
```

The script bundles the synthetic fixture into the actual Capacitor iOS wrapper,
adds a UI test target to its generated Xcode project, chooses an installed iPhone
simulator, and runs `xcodebuild test`. It uses the separate bundle identifier
`com.paperfront.learnharness.smoke`, with no provider credentials or learning
records. It never invokes archive, signing or upload. Production builds use a
separate checkout/job, the production entry and `mobile-dist`; fixture assets
are selected only with `LH_IOS_SMOKE=1`.

XCUITest exercises WKWebView accessibility and actual simulator software keyboard
appearance, entering custom Other (single and multiple choice), free recall and
new-session text, reaching Submit
or Send while editing, and observing synthetic server acceptance/continuation.
The custom-answer case also requires the software keyboard to disappear after
submission. Assertions fail if the native accessibility tree cannot expose the
controls. Screenshots are attached to every test's `.xcresult`; CI retains that
bundle on success and failure. Failed assertions also attach the native
accessibility hierarchy and an immediate screenshot. Offscreen question fields
are discovered by bounded accessibility-driven scrolling before input assertions.

This is a shared-component fixture inside the native wrapper, not a production
server integration test. API replies are mocked in memory; it does not verify
provider output, real persistence, remote authentication services, production
routing, physical-device keyboard animation, VoiceOver navigation or signing.
A passing build alone is never recorded as a runtime UI pass. The native tests
must run successfully on CI before a release is considered validated.

References: [Apple XCUIAutomation](https://developer.apple.com/documentation/xcuiautomation),
[Xcodeproj](https://github.com/CocoaPods/Xcodeproj),
[Playwright Docker](https://playwright.dev/docs/docker),
[Playwright CI](https://playwright.dev/docs/ci).
