"use client";
import { useEffect, useState, type ComponentProps } from "react";
import { apiFetch } from "@/lib/api-client";
import { resolveSettings, slotsConfigured } from "@/src/core";
import { Home } from "./home";
import { NewSession } from "./new-session";
import { Chat } from "./chat";
type Loaded = { configured: boolean; rendering: boolean; chat?: ComponentProps<typeof Chat> };
export function ClientPage({ path, search = "" }: { path: string; search?: string }) {
 const [result, setResult] = useState<Loaded | null>(null); const [error, setError] = useState<string | null>(null); const [attempt, setAttempt] = useState(0);
 useEffect(() => { const controller = new AbortController(); setResult(null); setError(null);
  void (async () => {
   const response = await apiFetch("/api/settings", { signal: controller.signal });
   if (!response.ok) throw new Error(`Unable to load settings (${response.status})`);
   const {settings} = await response.json() as {settings: Parameters<typeof resolveSettings>[0]};
   const loaded: Loaded = {configured: slotsConfigured(settings?.models), rendering: resolveSettings(settings).graph.rendering};
   if (path.startsWith("/chat/") && path !== "/chat/new") {
    const id = decodeURIComponent(path.slice("/chat/".length));
    const chatResponse = await apiFetch(`/api/chats/${encodeURIComponent(id)}`, {signal: controller.signal});
    if (!chatResponse.ok) throw new Error(chatResponse.status === 404 ? "Session not found." : `Unable to load session (${chatResponse.status})`);
    const record = await chatResponse.json();
    loaded.chat = {chatId: record.id, title: record.title, kind: record.kind ?? "teach", initialMessages: record.messages, initialConfigured: loaded.configured, initialPrompt: new URLSearchParams(search).get("prompt") ?? undefined, initiallyInFlight: record.turnInFlight, initiallyCompacting: record.compacting};
   }
   if (!controller.signal.aborted) setResult(loaded);
  })().catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load server data."); });
  return () => controller.abort();
 }, [path, search, attempt]);
 if (error) return <div role="alert" className="p-6">{error}<button className="ml-3 underline" onClick={() => setAttempt(n => n + 1)}>Retry</button></div>;
 if (!result) return <p role="status" className="p-6">Loading…</p>;
 if (result.chat) return <Chat key={result.chat.chatId} {...result.chat} />;
 if (path === "/chat/new") return <NewSession initialConfigured={result.configured} mode={new URLSearchParams(search).get("mode") === "practice" ? "practice" : "teach"} />;
 if (path !== "/") return <p className="p-6">Page not found.</p>;
 return <Home initialConfigured={result.configured} rendering={result.rendering} />;
}
