import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { NavigationProvider } from "@/components/navigation";
import { ClientPage } from "@/components/client-page";
import { AppProviders } from "@/components/app-providers";
import { ConnectionGate } from "@/components/connection-gate";
import "katex/dist/katex.min.css";
import "@/app/globals.css";
import "./mobile.css";
function currentUrl() { const next = new URL(window.location.href); if (next.pathname === "/settings") { next.pathname = "/chat/new"; window.history.replaceState(null, "", next); } return next; }
function App() {
 const [url, setUrl] = useState(currentUrl);
 useEffect(() => { const change = () => setUrl(currentUrl()); window.addEventListener("popstate", change); return () => window.removeEventListener("popstate", change); }, []);
 const navigation = useMemo(() => ({pathname: url.pathname, push(href: string) { const next = new URL(href, window.location.href); if (next.origin !== window.location.origin) throw new Error("External navigation is not supported"); const oldURL = window.location.href; window.history.pushState(null, "", next); setUrl(currentUrl()); if (new URL(oldURL).hash !== next.hash) window.dispatchEvent(new HashChangeEvent("hashchange", {oldURL, newURL:next.href})); } }), [url.pathname]);
 return <NavigationProvider value={navigation}><ConnectionGate required><AppProviders><ClientPage key={url.pathname + url.search} path={url.pathname} search={url.search}/></AppProviders></ConnectionGate></NavigationProvider>;
}
createRoot(document.getElementById("root")!).render(<App/>);
