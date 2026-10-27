# Phone layout fixture

This preview renders the real application components with synthetic messages. It
intercepts every API request, refuses mutations and external origins, and never
uses saved connection credentials, learning records, or paid inference.

Use Node 26 (the project CI version). From the repository root:

```sh
node node_modules/vite/bin/vite.js --config tests/mobile-fixture/vite.config.ts
```

Open `http://127.0.0.1:4317/`. Query cases are `quiz`, `ask`, `text`, `practice`,
`new`, `connection`, and `setup`, for example `/?case=practice`. Add
`&desktop=true` to use only the shared web styles and disable the mobile
viewport adapter.

With that preview running, execute the behavioral browser checks:

```sh
node tests/mobile-fixture/verify.mjs
```

The repeatable CI command starts and stops its own server:

```sh
npx playwright install chromium webkit
npm run test:mobile
LH_BROWSER=webkit npm run test:mobile
```

Playwright is a pinned project dependency. Set `LH_BROWSER_CHANNEL=chrome` to use
an installed Chrome locally; CI uses the installed Playwright engines. Set
`LH_FIXTURE_PORT` if 4317 is occupied, and `LH_MOBILE_ARTIFACTS` to change the
screenshot/evidence folder (default `/tmp/lh-mobile-validation`). The suite also
runs new-session and answer-submission transport checks. Native keyboard/runtime
coverage is documented in [the iOS runtime gate](../ios/README.md).

Checks cover 390×844 and 375×667, multiple choice and open answers, practice,
selection/custom-answer/confidence/draft preservation, reading the transcript,
keyboard-height resizing, shifted visual viewport resizing, short landscape
heights 221–300, sidebar search while the keyboard opens, connection/setup
fields and reachable actions, 16px editable fonts with smaller appearance text,
phone touch targets, true desktop menus. Browser
errors fail the run. The ordinary unit suite also covers viewport event
coalescing, pinch-zoom preservation, cleanup, focus intent and dock/menu geometry.

## Physical iPhone verification

Browser viewport changes simulate available space; they cannot prove WKWebView
software-keyboard animation, caret panning, safe-area behavior or native
accessory controls. Before considering the device behavior verified:

- Open a new pending question. Confirm its heading and first choice are visible.
  Read to the final choice and confidence control; choose an answer without the
  keyboard opening. Use Read conversation and Answer, preserving every draft.
- Tap the thinking/answer field, type a long draft, open and dismiss the software
  keyboard several times, and rotate portrait/landscape. Confirm the focused
  field and Submit remain reachable with no root-page pan, clipped controls,
  lingering blank space or repeated keyboard-height subtraction.
- Repeat on open-answer and practice questions, including a very short landscape
  keyboard viewport. The whole panel scrolls when there is insufficient room for
  a fixed answer footer.
- Open sidebar search, type with the keyboard visible, and confirm the sidebar
  remains open. Open provider/model menus and connection/setup fields; verify
  the action buttons remain reachable. Try an attached hardware keyboard and
  VoiceOver navigation.
- Change reading text below 16px, tap every text-entry surface, and verify iOS
  does not zoom into the field. Pinch zoom must remain available.

The existing fast desktop scroll-fold/reopen behavior still needs a manual
interaction check; the automated fixture did not reliably trigger that legacy
scroll-intent path. Existing dock state and broader regression tests pass.

Safe-area padding is retained once inside the visible surface, including a
small bottom gap while the keyboard is shown; physical device evidence should
precede any attempt to remove that gap or change native WebView scrolling.

The new-session transport regression also uses only synthetic in-memory replies:

```sh
node tests/mobile-fixture/verify-new-session.mjs
```

It checks authenticated remote creation through the real NewSession component,
network/HTTP/invalid JSON/invalid payload failures, preserved drafts and retry,
practice creation, and duplicate submission protection at a phone viewport.
