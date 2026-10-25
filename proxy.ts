import { NextResponse, type NextRequest } from "next/server";
import { desktopAPIAuthorized } from "./src/server/desktop-access.ts";
import { remoteAccess } from "./src/server/remote-access.ts";
/** Public pages are data-free shells; all record access goes through these APIs. */
export function proxy(request: NextRequest) {
 const remote = remoteAccess(request);
 if (remote.active) {
  if (remote.status === 204) return new NextResponse(null, { status: 204, headers: remote.headers });
  if (remote.status) return NextResponse.json({ error: remote.error }, { status: remote.status, headers: remote.headers });
  return NextResponse.next({ headers: remote.headers });
 }
 if (!desktopAPIAuthorized(request.headers)) return NextResponse.json({ error: "Desktop API access requires the trusted LearnHarness window." }, { status: 403, headers: { "Cache-Control": "no-store" } });
 return NextResponse.next();
}
export const config = { matcher: "/api/:path*" };
