import { timingSafeEqual } from "node:crypto";
type Environment = Record<string, string | undefined>;
export interface RemoteAccessDecision { status?: 204 | 401 | 403 | 503; active: boolean; headers: Headers; error?: string; }
const METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
const REQUEST_HEADERS = ["authorization", "content-type"];
function validOrigin(value: string): boolean {
 try { const url = new URL(value); const local = url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  return (url.protocol === "https:" || url.protocol === "capacitor:" || local) && !!url.hostname && !url.username && !url.password && !url.search && !url.hash && value === `${url.protocol}//${url.host}`;
 } catch { return false; }
}
/** Any remote configuration fails closed unless complete. Cookies and URL tokens are never accepted. */
export function remoteAccess(request: Pick<Request, "headers" | "method">, env: Environment = process.env): RemoteAccessDecision {
 const active = env.LH_REMOTE_SERVER !== undefined || env.LH_REMOTE_API_TOKEN !== undefined || env.LH_REMOTE_ALLOWED_ORIGINS !== undefined;
 const headers = new Headers(); if (!active) return { active, headers };
 headers.set("Cache-Control", "no-store"); headers.set("Vary", "Origin");
 const origins = (env.LH_REMOTE_ALLOWED_ORIGINS ?? "").split(",").map(value => value.trim()).filter(Boolean);
 const origin = request.headers.get("origin"); const allowedOrigin = origin !== null && origins.includes(origin) && validOrigin(origin);
 if (allowedOrigin) { headers.set("Access-Control-Allow-Origin", origin); headers.set("Access-Control-Expose-Headers", "Content-Disposition"); }
 const deny = (status: 401 | 403 | 503, error: string): RemoteAccessDecision => ({ active, status, headers, error });
 const expected = env.LH_REMOTE_API_TOKEN;
 if (env.LH_REMOTE_SERVER !== "1" || !expected || !/^[a-fA-F0-9]{64,128}$/.test(expected) || origins.some(value => !validOrigin(value)) || env.LH_DESKTOP_SERVER === "1" || env.LH_DESKTOP_API_SECRET) return deny(503, "Remote access is not configured correctly.");
 if (origin !== null && !allowedOrigin) return deny(403, "This client origin is not allowed.");
 if (request.method === "OPTIONS" && request.headers.has("access-control-request-method")) {
  const method = request.headers.get("access-control-request-method")!;
  const requested = (request.headers.get("access-control-request-headers") ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  if (!allowedOrigin || !METHODS.includes(method) || requested.some(value => !REQUEST_HEADERS.includes(value))) return deny(403, "This cross-origin request is not allowed.");
  headers.set("Access-Control-Allow-Methods", METHODS.join(", ")); headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type"); headers.set("Access-Control-Max-Age", "600"); headers.set("Vary", "Origin, Access-Control-Request-Method, Access-Control-Request-Headers");
  return { active, status: 204, headers };
 }
 const match = /^Bearer ([a-fA-F0-9]{64,128})$/i.exec(request.headers.get("authorization") ?? "");
 const actual = Buffer.from(match?.[1] ?? ""); const wanted = Buffer.from(expected);
 if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) { headers.set("WWW-Authenticate", 'Bearer realm="LearnHarness"'); return deny(401, "A valid server access token is required."); }
 return { active, headers };
}
