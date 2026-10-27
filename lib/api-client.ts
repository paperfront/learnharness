export interface ConnectionConfig { serverUrl: string; token: string }
let connection: ConnectionConfig | null = null;
let revision = 0;
let connectionAbort = new AbortController();
const resets = new Set<() => void>();
const listeners = new Set<() => void>();
export function getConnectionRevision() { return revision; }
export function subscribeConnectionChange(cb: () => void): () => void { listeners.add(cb); return () => { listeners.delete(cb); }; }
export function onConnectionReset(reset: () => void): () => void { resets.add(reset); return () => { resets.delete(reset); }; }
export function validateConnectionConfig(config: ConnectionConfig): ConnectionConfig {
 const url = new URL(config.serverUrl.trim());
 const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
 if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) throw new Error("Use an HTTPS server address.");
 if (url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error("Enter a server origin without paths or credentials.");
 const token = config.token.trim();
 if (!token || /[\r\n]/.test(token)) throw new Error("Enter a valid access token.");
 return { serverUrl: url.origin, token };
}
export function getConnectionConfig(): ConnectionConfig | null { return connection ? { ...connection } : null; }
function changed() {
 connectionAbort.abort(); connectionAbort = new AbortController(); revision++;
 for (const reset of resets) reset();
 if (typeof window !== "undefined") { try { window.localStorage.removeItem("lh.graph.camera.v1"); } catch { /* Storage can be disabled. */ } }
 for (const cb of listeners) cb();
}
/** Credentials stay in memory; consumers remount on a connection change. */
export function setConnectionConfig(config: ConnectionConfig): void { connection = validateConnectionConfig(config); changed(); }
export function clearConnectionConfig(): void { connection = null; changed(); }
export function createApiFetch(getConfig: () => ConnectionConfig | null, fetcher: typeof fetch): typeof fetch {
 return async (input, init) => {
  const config = getConfig();
  if (!config) return fetcher(input, init);
  const raw = input instanceof Request ? input.url : String(input);
  const url = new URL(raw, config.serverUrl);
  if (url.origin !== config.serverUrl || !url.pathname.startsWith("/api/") || url.username || url.password) throw new Error("Request must target the configured server API.");
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init?.headers).forEach((v, k) => headers.set(k, v));
  headers.set("Authorization", `Bearer ${config.token}`);
  return fetcher(input instanceof Request ? new Request(url, input) : url.href, { ...init, headers, credentials: "omit", redirect: "error", cache: "no-store" });
 };
}
function combinedSignal(signals: AbortSignal[]): AbortSignal {
 if (typeof AbortSignal.any === "function") return AbortSignal.any(signals);
 const controller = new AbortController();
 const abort = () => { controller.abort(); for (const signal of signals) signal.removeEventListener("abort", abort); };
 for (const signal of signals) { if (signal.aborted) { abort(); break; } signal.addEventListener("abort", abort, {once:true}); }
 return controller.signal;
}
export const apiFetch: typeof fetch = (input, init) => {
 const signal = combinedSignal([connectionAbort.signal, ...(init?.signal ? [init.signal] : input instanceof Request ? [input.signal] : [])]);
 return createApiFetch(getConnectionConfig, (...args) => globalThis.fetch(...args))(input, { ...init, signal });
};
export async function testConnection(config: ConnectionConfig): Promise<void> {
 const valid = validateConnectionConfig(config);
 const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15_000);
 try {
  const response = await createApiFetch(() => valid, (...args) => globalThis.fetch(...args))("/api/settings", { signal: controller.signal });
  if (!response.ok) throw new Error(`Connection failed (${response.status}). Check the address and token.`);
  const value = await response.json();
  if (!value || !("settings" in value)) throw new Error("This address did not return LearnHarness settings.");
 } finally { clearTimeout(timer); }
}
export async function downloadApiFile(path: string, fallbackFilename: string): Promise<void> {
 const response = await apiFetch(path);
 if (!response.ok) throw new Error(`Download failed (${response.status}).`);
 const filename = response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? fallbackFilename;
 const url = URL.createObjectURL(await response.blob());
 const link = document.createElement("a"); link.href = url; link.download = filename.replace(/[\\/]/g, "_");
 document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
