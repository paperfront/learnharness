/** Synthetic browser-only fixture. All API traffic is intercepted here;
 * no server credentials, learner records or model calls are used. */
import React from "react";
import { createRoot } from "react-dom/client";
import { Chat } from "@/components/chat";
import { NewSession } from "@/components/new-session";
import { AppProviders } from "@/components/app-providers";
import { NavigationProvider } from "@/components/navigation";
import { ConnectionGate } from "@/components/connection-gate";
import { SetupDialog } from "@/components/setup-dialog";
import { setConnectionConfig } from "@/lib/api-client";
import { installMobileViewport } from "@/mobile/viewport";
import type { LhMessage } from "@/src/core";
import "katex/dist/katex.min.css";
import "@/app/globals.css";

const params = new URLSearchParams(location.search);
const scenario = params.get("case") ?? "quiz";
if (params.get("desktop") !== "true") { await import("@/mobile/mobile.css"); installMobileViewport(); }
else document.documentElement.style.setProperty("--lh-viewport-height", "100dvh");
const prose = "Each choice has enough content to wrap naturally on a phone. Compare the evidence carefully before choosing an answer.";
const quiz = { question: "Which explanation best describes how scrolling should behave on a phone?", details: "Read the question and compare every option. This fixture contains no private learning data.", options: Array.from({length: 7}, (_, i) => ({ label: `Choice ${i + 1}: ${prose}`, value: `choice-${i}` })), correctAnswer: "choice-0", explanation: "The heading and every control should remain reachable." };
const tool = scenario === "practice" ? "problem" : scenario === "text" ? "recall" : scenario === "ask" ? "ask_user_question" : "probe";
const input = scenario === "practice" ? {statement: `Explain how a viewport changes when a keyboard opens.\n\n${Array(8).fill(prose).join("\n\n")}`} : scenario === "text" ? {question: "Describe how you would keep a focused answer and its submit button reachable.", details: Array(4).fill(prose).join("\n\n"), correctAnswer: "Resize the visible surface once."} : scenario === "ask" ? {...quiz, multiSelect:true} : quiz;
const messages = [
 ...Array.from({length: 6}, (_, i) => ({ id:`history-${i}`, role:"assistant", content:[{type:"text",text:`### Earlier explanation ${i + 1}\n\n${prose}\n\n${prose}`}], timestamp:i })),
 { id:"question-message", role:"assistant", content:[{type:"toolCall", id:"fixture-question", name:tool, arguments:input}], timestamp:10 },
...(scenario === "practice" ? [{id:"problem-ack",role:"toolResult",toolCallId:"fixture-question",toolName:"problem",content:[{type:"text",text:"Problem posed"}],details:null,isError:false,timestamp:11}] : []),
] as unknown as LhMessage[];
const model = {provider:"fixture",id:"synthetic-model"};
const settings = { models: Object.fromEntries(["strong","cheap","vision"].map(slot => [slot,{model,thinkingLevel:"off"}])) };
const record = {id:"mobile-fixture",title:"Phone layout check",kind:scenario === "practice" ? "practice":"teach",messages,settings:{model,thinkingLevel:"off"}};
const requests: string[] = [];
const navigations: string[] = [];
const creates: unknown[] = [];
Object.assign(window, {__fixtureCreates: creates});
Object.assign(window, {__fixtureNavigations: navigations});
Object.assign(window, {__fixtureRequests: requests});
window.fetch = async (request, init) => {
 const url = new URL(typeof request === "string" ? request : request instanceof URL ? request : request.url, location.origin);
 const method = init?.method ?? "GET";
 requests.push(`${method} ${url.pathname}`);
 if (params.has("remote")) {
  if (url.origin !== "https://synthetic.invalid" || new Headers(init?.headers).get("Authorization") !== "Bearer synthetic-fixture-token") throw new Error("Configured remote API transport required");
  if (method === "POST" && url.pathname === "/api/chats") {
   creates.push(JSON.parse(String(init?.body)));
   await new Promise(resolve => setTimeout(resolve, 200));
   const failure = (window as unknown as {__fixtureFailure?: string}).__fixtureFailure;
   if (failure === "network") throw new TypeError("Synthetic network failure");
   if (failure === "status") return Response.json({error:"synthetic"},{status:401});
   if (failure === "invalid") return Response.json({id:null});
   if (failure === "json") return new Response("not JSON");
   return Response.json({id:"synthetic-created"});
  }
 } else if (url.origin !== location.origin) throw new Error("External network is disabled in this fixture");
 if (url.pathname === "/api/events") return new Response(new ReadableStream({start(controller) {controller.enqueue(new TextEncoder().encode(": synthetic fixture\n\n")); init?.signal?.addEventListener("abort", () => controller.close(),{once:true});}}),{headers:{"content-type":"text/event-stream"}});
 if (method !== "GET") throw new Error(`Mutation disabled in layout fixture: ${method} ${url.pathname}`);
 if (url.pathname === "/api/settings") return Response.json({settings});
 if (url.pathname === "/api/models") return Response.json({models:[{...model,name:"Synthetic model",input:["text","image"],reasoning:false,supportedLevels:["off"],maxTokens:4096,contextWindow:128000,cost:{input:0,output:0,cacheRead:0,cacheWrite:0}}],providers:[{id:"fixture",label:"Fixture",keyPresent:scenario!=="setup"}],slots:settings.models,rolePins:{},defaults:null});
 if (url.pathname === "/api/keys") return Response.json({statuses:[],providers:[{id:"fixture",label:"Fixture provider",envVar:"FIXTURE_API_KEY"}]});
 if (url.pathname === "/api/chats/mobile-fixture") return Response.json(record);
 if (url.pathname === "/api/chats") return Response.json({chats:[{id:record.id,title:record.title,kind:record.kind,updatedAt:new Date().toISOString()}]});
 if (url.pathname === "/api/jobs") return Response.json({jobs:[]});
 if (url.pathname === "/api/activity") return Response.json({turns:[],jobs:[],compactions:[]});
 if (url.pathname === "/api/graph") return Response.json({nodes:[],edges:[]});
 return Response.json({});
};
if (scenario !== "connection") setConnectionConfig({serverUrl:params.has("remote") ? "https://synthetic.invalid" : location.origin,token:"synthetic-fixture-token"});
const content = scenario === "new" ? <NewSession initialConfigured mode={params.has("practice") ? "practice" : "teach"}/> : scenario === "setup" ? <SetupDialog open onClose={()=>{}} onDone={()=>{}}/> : <Chat chatId={record.id} title={record.title} kind={record.kind as "teach"|"practice"} initialMessages={messages} initialConfigured/>;
createRoot(document.getElementById("root")!).render(<NavigationProvider value={{pathname:"/chat/mobile-fixture",push(target){navigations.push(target);}}}><ConnectionGate required><AppProviders>{content}</AppProviders></ConnectionGate></NavigationProvider>);
