/** Capacitor's custom scheme does not add the HTTP URL's implicit root slash. */
export function normalizeMobileUrl(href: string): URL {
 const url = new URL(href);
 if (url.pathname === "" || url.pathname === "/index.html") url.pathname = "/";
 if (url.pathname === "/settings") url.pathname = "/chat/new";
 return url;
}

export function mobileNavigationUrl(href: string, current: string): URL {
 const base = new URL(current);
 const next = new URL(href, base);
 // Custom-scheme origins can both be "null" even for different hosts.
 if (next.protocol !== base.protocol || next.host !== base.host || next.username || next.password) {
  throw new Error("External navigation is not supported");
 }
 return normalizeMobileUrl(next.href);
}
