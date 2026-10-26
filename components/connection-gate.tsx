"use client";
import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import { apiFetch, getConnectionConfig, getConnectionRevision, subscribeConnectionChange, setConnectionConfig, clearConnectionConfig, testConnection } from "@/lib/api-client";
import type { ConnectionStorage } from "@/lib/connection-storage";
export function ConnectionGate({children, required = false, storage}: {children:ReactNode; required?:boolean; storage?:ConnectionStorage}) {
 const [storageLoaded,setStorageLoaded] = useState(!storage);
 const [restoreAttempt,setRestoreAttempt] = useState(0);
 const [restoreFailed,setRestoreFailed] = useState(false);
 const [revision,setRevision] = useState(getConnectionRevision);
 const [ready,setReady] = useState(false);
 const [checking,setChecking] = useState(true);
 const [serverUrl,setServerUrl] = useState(""); const [token,setToken] = useState("");
 const [error,setError] = useState(""); const [busy,setBusy] = useState(false);
 useEffect(() => {
  if (!storage) return;
  let active = true; const started = getConnectionRevision();
  setStorageLoaded(false); setRestoreFailed(false);
  void storage.read().then(config => {
   if (active && getConnectionRevision() === started && config && !getConnectionConfig()) setConnectionConfig(config);
  }).catch(() => {
   if (active) {setRestoreFailed(true); setError("Could not read your saved connection. Retry or enter your connection details.");}
  }).finally(() => {if (active) setStorageLoaded(true);});
  return () => {active = false;};
 }, [storage,restoreAttempt]);
 useEffect(() => subscribeConnectionChange(() => { setRevision(getConnectionRevision()); setReady(false); }), []);
 useEffect(() => { if (!storageLoaded) return; const controller = new AbortController(); setChecking(true); setReady(false);
  if (getConnectionConfig()) { setReady(true); setChecking(false); return () => controller.abort(); }
  if (required) {setChecking(false); return () => controller.abort();}
  setServerUrl(window.location.origin);
  void apiFetch("/api/settings", {signal:controller.signal}).then((r) => {if (!controller.signal.aborted) {setReady(r.ok); if (!r.ok && r.status !== 401) setError(`Server unavailable (${r.status})`);}}).catch(() => {if (!controller.signal.aborted) setError("Unable to connect to the server.");}).finally(() => {if (!controller.signal.aborted) setChecking(false);});
  return () => controller.abort();
 }, [required,revision,storageLoaded]);
 async function connect(event:FormEvent) {event.preventDefault(); setBusy(true); setError(""); const started = getConnectionRevision(); try {const config = {serverUrl,token}; await testConnection(config); if (started === getConnectionRevision()) { if (storage) {try {await storage.save(config);} catch {throw new Error("Could not save your connection securely. Please try again.");}} if (started === getConnectionRevision()) {setConnectionConfig(config); setToken(""); setRestoreFailed(false);} }} catch(cause) {setError(cause instanceof Error ? cause.message : "Connection failed.");} finally {setBusy(false);} }
 async function disconnect() {
  setBusy(true); setError("");
  try { await storage?.clear(); clearConnectionConfig(); setToken(""); }
  catch {setError("Could not remove your saved connection. Please try Disconnect server again.");}
  finally {setBusy(false);}
 }
 if (checking || !storageLoaded) return <p role="status" className="p-6">Connecting…</p>;
 if (ready) return <div key={revision} className="lh-connection-shell flex min-h-0 flex-col">{getConnectionConfig() && <div className="flex shrink-0 justify-end border-b px-3 py-1 text-xs"><button disabled={busy} onClick={() => void disconnect()}>Disconnect server</button></div>}{error && <p role="alert" className="px-3 py-2">{error}</p>}<div className="min-h-0 flex-1">{children}</div></div>;
 return <main className="lh-connection-form mx-auto flex h-full min-h-0 max-w-md flex-col overflow-y-auto p-6"><h1 className="mb-3 text-2xl">Connect to LearnHarness</h1><p className="mb-6 text-sm text-muted-foreground">{storage ? "Your server connection is saved securely on this iPhone and restored when you reopen the app." : "Connect this app to your learning server. Your access token is kept in memory for this app session."}</p><form onSubmit={connect} className="space-y-4"><label className="block">Server URL<input disabled={busy} required type="url" autoCapitalize="none" autoCorrect="off" placeholder="https://your-server.example" value={serverUrl} onChange={e=>setServerUrl(e.target.value)} className="mt-1 w-full rounded border bg-background p-3"/></label><label className="block">Access token<input disabled={busy} required type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} className="mt-1 w-full rounded border bg-background p-3"/></label>{error && <p role="alert">{error}</p>}{restoreFailed && <button type="button" disabled={busy} onClick={() => {setError(""); setRestoreAttempt(n => n + 1);}}>Retry saved connection</button>}<button disabled={busy} type="submit" className="w-full rounded border p-3">{busy?"Connecting…":"Connect"}</button></form></main>;
}
