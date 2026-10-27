import { apiFetch } from "./api-client";
export class EventFrameParser {
 private buffer = "";
 private event = "message";
 private data: string[] = [];
 constructor(private emit: (event: string, data: string) => void) {}
 feed(text: string) {
  this.buffer += text;
  for (;;) {
   const match = /\r\n|\r|\n/.exec(this.buffer);
   if (!match || (match[0] === "\r" && match.index === this.buffer.length - 1)) return;
   const line = this.buffer.slice(0, match.index); this.buffer = this.buffer.slice(match.index + match[0].length);
   if (!line) { if (this.data.length) this.emit(this.event, this.data.join("\n")); this.event = "message"; this.data = []; continue; }
   const colon = line.indexOf(":"); const field = colon < 0 ? line : line.slice(0, colon);
   const value = colon < 0 ? "" : line.slice(colon + 1).replace(/^ /, "");
   if (field === "event") this.event = value;
   if (field === "data") this.data.push(value);
  }
 }
}
export function openFetchEvents(fetcher: typeof fetch = apiFetch, retryMs = 1_000) {
 const controller = new AbortController();
 const listeners = new Map<string, Set<(data: string) => void>>(); const opens = new Set<() => void>();
 let timer: ReturnType<typeof setTimeout> | undefined; let closed = false;
 async function connect() {
  try {
   const response = await fetcher("/api/events", { signal: controller.signal, headers: { Accept: "text/event-stream" } });
   if (response.status === 401 || response.status === 403) return;
   if (!response.ok || !response.body || !response.headers.get("content-type")?.includes("text/event-stream")) throw new Error("Event channel unavailable");
   if (closed) { await response.body.cancel(); return; }
   for (const cb of opens) cb();
   const reader = response.body.getReader(); const decoder = new TextDecoder();
   const parser = new EventFrameParser((event, data) => { if (!closed) for (const cb of listeners.get(event) ?? []) cb(data); });
   try { while (!closed) { const { done, value } = await reader.read(); if (done) break; parser.feed(decoder.decode(value, { stream: true })); } }
   finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
  } catch { /* Retry after transport loss; POST submissions are never retried here. */ }
  if (!closed) timer = setTimeout(() => void connect(), retryMs);
 }
 queueMicrotask(() => { if (!closed) void connect(); });
 return {
  close() { closed = true; controller.abort(); clearTimeout(timer); listeners.clear(); opens.clear(); },
  onOpen(cb: () => void) { opens.add(cb); },
  onEvent(name: string, cb: (data: string) => void) { const set = listeners.get(name) ?? new Set<(data: string) => void>(); set.add(cb); listeners.set(name, set); },
 };
}
