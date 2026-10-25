"use client";
import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import { apiFetch, getConnectionConfig, getConnectionRevision, subscribeConnectionChange, setConnectionConfig, clearConnectionConfig, testConnection } from "@/lib/api-client";
export function ConnectionGate({children, required = false}: {children:ReactNode; required?:boolean}) {
 const [revision,setRevision] = useState(getConnectionRevision);
 const [ready,setReady] = useState(false);
 const [checking,setChecking] = useState(true);
 const [serverUrl,setServerUrl] = useState(""); const [token,setToken] = useState("");
 const [error,setError] = useState(""); const [busy,setBusy] = useState(false);
 useEffect(() => subscribeConnectionChange(() => { setRevision(getConnectionRevision()); setReady(false); }), []);
 useEffect(() => { const controller = new AbortController(); setChecking(true); setReady(false);
  if (getConnectionConfig()) { setReady(true); setChecking(false); return () => controller.abort(); }
  if (required) {setChecking(false); return () => controller.abort();}
  setServerUrl(window.location.origin);
  void apiFetch("/api/settings", {signal:controller.signal}).then((r) => {if (!controller.signal.aborted) {setReady(r.ok); if (!r.ok && r.status !== 401) setError(`Server unavailable (${r.status})`);}}).catch(() => {if (!controller.signal.aborted) setError("Unable to connect to the server.");}).finally(() => {if (!controller.signal.aborted) setChecking(false);});
  return () => controller.abort();
 }, [required,revision]);
 async function connect(event:FormEvent) {event.preventDefault(); setBusy(true); setError(""); const started = getConnectionRevision(); try {const config = {serverUrl,token}; await testConnection(config); if (started === getConnectionRevision()) {setConnectionConfig(config); setToken("");}} catch(cause) {setError(cause instanceof Error ? cause.message : "Connection failed.");} finally {setBusy(false);} }
 if (checking) return <p role="status" className="p-6">Connecting…</p>;
 if (ready) return <div key={revision} className="flex min-h-0 flex-col" style={{height:"var(--lh-safe-height, 100dvh)"}}>{getConnectionConfig() && <div className="flex shrink-0 justify-end border-b px-3 py-1 text-xs"><button onClick={() => clearConnectionConfig()}>Disconnect server</button></div>}<div className="min-h-0 flex-1">{children}</div></div>;
 return <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-6"><h1 className="mb-3 text-2xl">Connect to LearnHarness</h1><p className="mb-6 text-sm text-muted-foreground">Connect this app to your learning server. Your access token is kept in memory for this app session.</p><form onSubmit={connect} className="space-y-4"><label className="block">Server URL<input disabled={busy} required type="url" autoCapitalize="none" autoCorrect="off" placeholder="https://your-server.example" value={serverUrl} onChange={e=>setServerUrl(e.target.value)} className="mt-1 w-full rounded border bg-background p-3"/></label><label className="block">Access token<input disabled={busy} required type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} className="mt-1 w-full rounded border bg-background p-3"/></label>{error && <p role="alert">{error}</p>}<button disabled={busy} type="submit" className="w-full rounded border p-3">{busy?"Connecting…":"Connect"}</button></form></main>;
}
