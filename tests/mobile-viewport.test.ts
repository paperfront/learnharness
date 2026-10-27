import assert from "node:assert/strict";
import { test } from "node:test";
import { parseHTML } from "linkedom";
import { installMobileViewport, viewportGeometry } from "../mobile/viewport.ts";
import { dockShellAllowance, historyScrollTop } from "../components/dock-geometry.ts";
import { allowAutomaticTextFocus, focusAutomatically, installFocusIntent } from "../components/touch-layout.ts";

function mockWindow(withViewport = true) {
 const document = parseHTML("<html class='dark'><body></body></html>").document;
 const win = new EventTarget() as EventTarget & {document:Document;innerHeight:number;visualViewport?:EventTarget & {height:number;offsetTop:number;scale:number};requestAnimationFrame:(cb:FrameRequestCallback)=>number;cancelAnimationFrame:(id:number)=>void};
 const callbacks = new Map<number,FrameRequestCallback>(); let sequence=0;
 Object.assign(win,{document,innerHeight:844,requestAnimationFrame:(cb:FrameRequestCallback)=>{callbacks.set(++sequence,cb);return sequence;},cancelAnimationFrame:(id:number)=>callbacks.delete(id)});
 if (withViewport) win.visualViewport=Object.assign(new EventTarget(),{height:844,offsetTop:0,scale:1});
 const flush=()=>{for(const [id,cb] of [...callbacks]) {callbacks.delete(id);cb(0);}};
 return {win,document,callbacks,flush};
}
test("mobile viewport follows visible height and offset once, coalesces events, preserves pinch zoom and cleans up",()=>{
 const {win,document,callbacks,flush}=mockWindow();
 const dispose=installMobileViewport(win as unknown as Window);
 const height=()=>document.documentElement.style.getPropertyValue("--lh-viewport-height");
 assert.equal(height(),"844px");
 Object.assign(win.visualViewport!,{height:460,offsetTop:18});
 win.visualViewport!.dispatchEvent(new Event("resize")); win.visualViewport!.dispatchEvent(new Event("scroll"));win.dispatchEvent(new Event("resize"));
 assert.equal(callbacks.size,1);flush();assert.equal(height(),"460px","no second keyboard subtraction");
 assert.equal(document.documentElement.style.getPropertyValue("--lh-viewport-top"),"18px");
 Object.assign(win.visualViewport!,{height:230,offsetTop:42,scale:2});win.visualViewport!.dispatchEvent(new Event("resize"));flush();assert.equal(height(),"460px");
 Object.assign(win.visualViewport!,{height:390,offsetTop:0,scale:1});win.dispatchEvent(new Event("orientationchange"));flush();assert.equal(height(),"390px");
 win.visualViewport!.height=400;win.dispatchEvent(new Event("pageshow"));flush();assert.equal(height(),"400px");
 win.dispatchEvent(new Event("resize"));assert.equal(callbacks.size,1);dispose();assert.equal(callbacks.size,0);
	assert.equal(height(),"");assert.equal(document.documentElement.className,"dark");
 win.visualViewport!.dispatchEvent(new Event("resize"));win.dispatchEvent(new Event("resize"));assert.equal(callbacks.size,0);
});
test("viewport fallback follows native-resized window and clamps invalid geometry",()=>{
 const {win,document,flush}=mockWindow(false);const dispose=installMobileViewport(win as unknown as Window);
 win.innerHeight=375;win.dispatchEvent(new Event("resize"));flush();assert.equal(document.documentElement.style.getPropertyValue("--lh-viewport-height"),"375px");
 assert.deepEqual(viewportGeometry(-5,-2),{height:0,top:0});dispose();
});
test("whole-shell allowance includes answer/stats/siblings without a clipping minimum",()=>{
 assert.equal(dockShellAllowance(600,950,870),512);
 assert.equal(dockShellAllowance(240,1000,920),152,"natural scrollHeight works even when outer block is capped");
 assert.equal(dockShellAllowance(60,300,100),0,"very short landscape must not force a160px panel");
 assert.equal(historyScrollTop(2000,600,700,120),820,"history lands above retained question spacer");
 assert.equal(historyScrollTop(300,600,400),0);
});
test("coarse-pointer automatic focus waits for keyboard intent; explicit keyboard navigation still focuses",()=>{
 const previous=globalThis.window;const target=new EventTarget();
 Object.assign(globalThis,{window:{matchMedia:()=>({matches:true})}});
 const dispose=installFocusIntent(target as unknown as Document);let focusCount=0;
 const element={focus:()=>{focusCount++;}} as unknown as HTMLElement;
 assert.equal(allowAutomaticTextFocus(),false);focusAutomatically(element);assert.equal(focusCount,0);
 target.dispatchEvent(new Event("keydown"));assert.equal(allowAutomaticTextFocus(),true);focusAutomatically(element);assert.equal(focusCount,1);
 target.dispatchEvent(new Event("pointerdown"));assert.equal(allowAutomaticTextFocus(),false);
 dispose();Object.assign(globalThis,{window:previous});
});
