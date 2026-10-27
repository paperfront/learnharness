import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeMobileUrl, mobileNavigationUrl } from "../mobile/routing.ts";

test("native entry URLs resolve to home rather than page not found", () => {
 for (const href of ["capacitor://localhost", "capacitor://localhost/", "capacitor://localhost/index.html", "https://localhost/"]) {
  assert.equal(normalizeMobileUrl(href).pathname, "/");
 }
 const url = normalizeMobileUrl("capacitor://localhost/index.html?mode=practice#graph");
 assert.equal(url.pathname, "/"); assert.equal(url.search, "?mode=practice"); assert.equal(url.hash, "#graph");
});
test("native navigation preserves session routes and maps the settings entry", () => {
 assert.equal(mobileNavigationUrl("/chat/new?mode=practice", "capacitor://localhost").pathname, "/chat/new");
 assert.equal(mobileNavigationUrl("/chat/abc", "capacitor://localhost").pathname, "/chat/abc");
 assert.equal(normalizeMobileUrl("capacitor://localhost/settings").pathname, "/chat/new");
 assert.equal(normalizeMobileUrl("capacitor://localhost/unknown").pathname, "/unknown");
});
test("native navigation rejects other hosts even when custom-scheme origins are null", () => {
 for (const href of ["capacitor://other/chat/new", "https://localhost/", "capacitor://user@localhost/"]) {
  assert.throws(() => mobileNavigationUrl(href, "capacitor://localhost"), /External navigation/);
 }
});
