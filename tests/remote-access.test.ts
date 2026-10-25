import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { remoteAccess } from "../src/server/remote-access.ts";
import { proxy } from "../proxy.ts";
const token = "a1".repeat(32);
const env = { LH_REMOTE_SERVER: "1", LH_REMOTE_API_TOKEN: token, LH_REMOTE_ALLOWED_ORIGINS: "capacitor://localhost,https://learn.example,http://localhost:5173" };
function request(method = "GET", headers: Record<string, string> = {}) { return { method, headers: new Headers(headers) }; }
test("remote configuration fails closed and leaves unconfigured local mode unchanged", () => {
 assert.equal(remoteAccess(request(), {}).active, false);
 for (const bad of [{ LH_REMOTE_SERVER: "1" }, { LH_REMOTE_API_TOKEN: token }, { ...env, LH_REMOTE_SERVER: "0" }, { ...env, LH_REMOTE_API_TOKEN: "weak" }, { ...env, LH_REMOTE_ALLOWED_ORIGINS: "*" }, { ...env, LH_REMOTE_ALLOWED_ORIGINS: "https://learn.example/path" }, { ...env, LH_REMOTE_ALLOWED_ORIGINS: "null" }, { ...env, LH_REMOTE_ALLOWED_ORIGINS: "http://learn.example" }, { ...env, LH_DESKTOP_SERVER: "1" }, { ...env, LH_DESKTOP_API_SECRET: token }]) assert.equal(remoteAccess(request(), bad).status, 503);
});
test("every API method requires bearer auth and native requests without Origin work", () => {
 for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]) {
  for (const authorization of ["", "Bearer wrong", `Basic ${token}`, `Bearer ${token}, ${token}`]) assert.equal(remoteAccess(request(method, { authorization }), env).status, 401);
  assert.equal(remoteAccess(request(method, { authorization: `Bearer ${token}` }), env).status, undefined);
 }
 assert.equal(remoteAccess(request("GET", { cookie: `token=${token}` }), env).status, 401);
 assert.equal(remoteAccess(request("GET", { "x-learnharness-desktop": token }), env).status, 401);
});
test("origin allowlist is exact and auth errors include trusted CORS headers", () => {
 for (const origin of ["https://learn.example.evil", "null", "http://learn.example", "capacitor://evil"]) {
  const result = remoteAccess(request("GET", { origin, authorization: `Bearer ${token}` }), env);
  assert.equal(result.status, 403); assert.equal(result.headers.get("Access-Control-Allow-Origin"), null);
 }
 for (const origin of ["capacitor://localhost", "https://learn.example", "http://localhost:5173"]) {
  const result = remoteAccess(request("GET", { origin }), env); assert.equal(result.status, 401); assert.equal(result.headers.get("Access-Control-Allow-Origin"), origin); assert.equal(result.headers.get("Access-Control-Allow-Credentials"), null);
 }
});
test("preflight accepts only allowed origin, methods and headers", () => {
 const headers = { origin: "capacitor://localhost", "access-control-request-method": "POST", "access-control-request-headers": "Authorization, Content-Type" };
 assert.equal(remoteAccess(request("OPTIONS", headers), env).status, 204);
 for (const mutation of [{ origin: "https://evil.example" }, { "access-control-request-method": "TRACE" }, { "access-control-request-headers": "X-Privileged" }]) assert.equal(remoteAccess(request("OPTIONS", { ...headers, ...mutation }), env).status, 403);
 assert.equal(remoteAccess(request("OPTIONS", { "access-control-request-method": "GET" }), env).status, 403);
 assert.equal(remoteAccess(request("GET", headers), env).status, 401);
});
test("proxy integrates remote auth and SSE response headers", () => {
 const names = [...Object.keys(env), "LH_DESKTOP_SERVER", "LH_DESKTOP_API_SECRET"]; const old = Object.fromEntries(names.map(name => [name, process.env[name]]));
 try { Object.assign(process.env, env); delete process.env.LH_DESKTOP_SERVER; delete process.env.LH_DESKTOP_API_SECRET;
  const url = "https://server.example/api/events"; const origin = "capacitor://localhost";
  assert.equal(proxy(new NextRequest(url)).status, 401);
  const response = proxy(new NextRequest(url, { headers: { origin, authorization: `Bearer ${token}` } }));
  assert.equal(response.headers.get("x-middleware-next"), "1"); assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
  assert.equal(proxy(new NextRequest(url, { method: "OPTIONS", headers: { origin, "access-control-request-method": "GET", "access-control-request-headers": "Authorization" } })).status, 204);
 } finally { for (const name of names) { if (old[name] === undefined) delete process.env[name]; else process.env[name] = old[name]; } }
});
