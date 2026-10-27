import assert from "node:assert/strict";
import { test } from "node:test";
import { EventFrameParser, openFetchEvents } from "../lib/fetch-events";
test("SSE frames survive split CRLF and multiline data", () => {
 const events: Array<[string,string]> = []; const parser = new EventFrameParser((event,data) => events.push([event,data]));
 for (const chunk of [": heartbeat\r", "\nevent: changed\r\ndata: first\r", "\ndata: second\r\n\r", "\ndata: next\n\n"]) parser.feed(chunk);
 assert.deepEqual(events, [["changed", "first\nsecond"], ["message", "next"]]);
});
test("event channel reconnects, resyncs, and close cancels its request", async () => {
 let calls = 0; let opens = 0; let signal: AbortSignal | null | undefined; let finish!: () => void;
 const completed = new Promise<void>((resolve) => { finish = resolve; });
 const fetcher: typeof fetch = async (_input, init) => { calls++; signal = init?.signal;
  return new Response(new ReadableStream<Uint8Array>({ start(controller) {
   if (calls === 1) { controller.enqueue(new TextEncoder().encode('event: changed\ndata: {"ok":true}\n\n')); controller.close(); }
   else signal?.addEventListener("abort", () => controller.close(), { once: true });
  }}), { headers: { "Content-Type": "text/event-stream" } });
 };
 const source = openFetchEvents(fetcher, 1); const events: string[] = [];
 source.onEvent("changed", (data) => events.push(data)); source.onOpen(() => { opens++; if (opens === 2) finish(); });
 try { await Promise.race([completed, new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error("Reconnect timed out")), 1000).unref())]); assert.equal(opens, 2); assert.deepEqual(events, ['{"ok":true}']); source.close(); assert.equal(signal?.aborted, true); }
 finally { source.close(); }
});
test("authentication failure does not reconnect indefinitely", async () => {
 let calls = 0; const source = openFetchEvents(async () => { calls++; return new Response(null, { status: 401 }); }, 1);
 await new Promise((resolve) => setTimeout(resolve, 15)); source.close(); assert.equal(calls, 1);
});
