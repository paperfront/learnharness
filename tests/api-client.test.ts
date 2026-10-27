import assert from "node:assert/strict";
import { test } from "node:test";
import { createApiFetch, validateConnectionConfig, setConnectionConfig, clearConnectionConfig, getConnectionConfig, apiFetch, getConnectionRevision } from "../lib/api-client";
const config = { serverUrl: "https://learning.example", token: "secret-token" };
test("remote transport confines bearer credentials and refuses redirects", async () => {
 let seen: {input: RequestInfo | URL; init?: RequestInit} | undefined;
 const transport = createApiFetch(() => config, async (input, init) => { seen = {input, init}; return new Response("{}"); });
 await transport("/api/chats", { headers: { "X-Test": "yes" }, redirect: "follow", credentials: "include" });
 assert.equal(String(seen?.input), "https://learning.example/api/chats"); assert.equal(new Headers(seen?.init?.headers).get("Authorization"), "Bearer secret-token"); assert.equal(new Headers(seen?.init?.headers).get("X-Test"), "yes"); assert.equal(seen?.init?.redirect, "error"); assert.equal(seen?.init?.credentials, "omit");
 for (const path of ["https://evil.example/api/chats", "//evil.example/api/chats", "/api/../private", "https://learning.example.evil/api/chats", "https://user@learning.example/api/chats"]) await assert.rejects(transport(path));
});
test("same-origin mode preserves caller arguments", async () => {
 const init = { method: "POST", body: "hello" }; const transport = createApiFetch(() => null, async (input, options) => { assert.equal(input, "/api/chat"); assert.equal(options, init); return new Response(); }); await transport("/api/chat", init);
});
test("connection URL rejects insecure remote origins and URL credentials", () => {
 for (const serverUrl of ["http://example.com", "https://user:pass@example.com", "https://example.com/path", "https://example.com/?key=secret"]) assert.throws(() => validateConnectionConfig({ ...config, serverUrl }));
 assert.equal(validateConnectionConfig({ ...config, serverUrl: "https://learning.example/" }).serverUrl, config.serverUrl);
 assert.equal(validateConnectionConfig({ ...config, serverUrl: "http://localhost:3000" }).serverUrl, "http://localhost:3000");
});
test("switching connection aborts old work and invalidates revision", async () => {
 const original = globalThis.fetch; let requestSignal: AbortSignal | null | undefined;
 globalThis.fetch = async (_input, init) => { requestSignal = init?.signal; return new Response(); };
 try { setConnectionConfig(config); const revision = getConnectionRevision(); await apiFetch("/api/chats"); assert.equal(requestSignal?.aborted, false); clearConnectionConfig(); assert.equal(requestSignal?.aborted, true); assert.ok(getConnectionRevision() > revision); assert.equal(getConnectionConfig(), null); }
 finally { globalThis.fetch = original; clearConnectionConfig(); }
});
