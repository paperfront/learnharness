// Run through npm run test:mobile for a managed synthetic preview server.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import {launchBrowser, fixtureURL} from "./runtime.mjs";
const browser=await launchBrowser();
const output=process.env.LH_MOBILE_ARTIFACTS ?? "/tmp/lh-mobile-validation";
await mkdir(output,{recursive:true});
const evidence=[];
async function run(name,viewport,fn,desktop=false) {
 const context=await browser.newContext({viewport,isMobile:!desktop,hasTouch:!desktop,deviceScaleFactor:1});
 const page=await context.newPage();const errors=[];
 page.on("pageerror",error=>errors.push(error.message));
 page.on("console",message=>{if(message.type()==="error") errors.push(message.text());});
 try {
  await page.goto(`${fixtureURL}/?case=${name.split("-")[0]}${desktop?"&desktop=true":""}`);
  await page.locator(name.startsWith("connection")?".lh-connection-form":name.startsWith("setup")?'[data-testid="setup-dialog"]':name.startsWith("new")?'[data-testid="composer"]':".lh-panel-frame").waitFor();
  await page.waitForTimeout(500);
  assert.equal(await page.evaluate(()=>matchMedia("(pointer:coarse)").matches),!desktop);
  await fn(page);
  await page.waitForTimeout(250);
  assert.deepEqual(errors,[],`${name} browser errors`);
  console.log(`Passed ${name}`);
  await page.screenshot({path:`${output}/${name}.png`});
  evidence.push({name,viewport,touch:!desktop,errors});
 } catch(error) {
  await page.screenshot({path:`${output}/${name}-failed.png`}).catch(()=>{});
  evidence.push({name,viewport,touch:!desktop,errors,failure:String(error)});
  await writeFile(`${output}/evidence.json`,JSON.stringify(evidence,null,2));
  throw error;
 } finally {await context.close();}
}
async function geometry(page,{heading=true}={}) {
 const result=await page.evaluate(()=>{
  const rect=selector=>{const e=document.querySelector(selector);const r=e?.getBoundingClientRect();return r?{top:r.top,bottom:r.bottom,height:r.height,width:r.width}:null;};
  const block=document.querySelector(".lh-dock-block");
  return {root:rect("#root"),panel:rect(".lh-panel-frame"),block:rect(".lh-dock-block"),prose:rect(".lh-question-prose, .lh-practice-prose"),footer:rect(".lh-answer-form"),scrollY,documentHeight:document.documentElement.scrollHeight,short:block?.dataset.short,shellAllowance:block?.style.getPropertyValue("--dock-shell-max-h"),stats:[...document.querySelectorAll('[data-testid="stats-bar"] > button, [data-testid="stats-bar"] > div > button')].map(e=>e.getBoundingClientRect().height)};
 });
 assert.equal(result.scrollY,0,"root must not pan");
 assert.ok(result.documentHeight<=result.root.height+1,"no document overflow");
 assert.ok(result.block.top>=80-1,`complete dock starts below header: ${JSON.stringify(result)}`);
 assert.ok(result.block.bottom<=result.root.bottom+1,"complete dock fits visible surface");
 if(heading) assert.ok(result.prose.top>=result.block.top-1,"new question begins with heading visible");
 assert.ok(result.stats.every(h=>h>=44),"phone footer controls have touch targets");
 return result;
}
try {
 for(const [name,viewport] of [["ask-390",{width:390,height:844}],["quiz-375",{width:375,height:667}],["text-390",{width:390,height:844}],["practice-390",{width:390,height:844}]]) {
  await run(name,viewport,async page=>{
   await geometry(page);
   await page.evaluate(()=>document.documentElement.style.setProperty("--lh-prose-size","12px"));
   assert.ok(await page.locator("textarea").last().evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=16));
   if(name.startsWith("ask")) {
    const rows=page.locator('[data-testid="question-dock"] button[role=checkbox]');
    await rows.first().click();assert.notEqual(await page.evaluate(()=>document.activeElement?.tagName),"TEXTAREA");
    await page.locator('[data-testid="thinking-field"] textarea').fill("Preserved phone draft");
    await page.getByPlaceholder("Type your own answer…").fill("A preserved custom option");
    await page.getByRole("button",{name:"Read conversation"}).click();
    await page.locator('[data-testid="question-dock-bar"]').waitFor();
    await page.waitForTimeout(250);
    assert.ok(await page.locator(".lh-prose").first().count());
    const transcriptVisible=await page.evaluate(()=>[...document.querySelectorAll('[data-session-find-root]')].filter(e=>!e.closest('[data-testid="question-dock"]')).some(e=>{const r=e.getBoundingClientRect();return r.bottom>84&&r.top<innerHeight-150;}));
    assert.ok(transcriptVisible,"Read conversation reveals transcript, not the empty dock spacer");
    await page.locator('[data-testid="question-dock-bar"]').click();
    assert.equal(await page.locator('[data-testid="thinking-field"] textarea').inputValue(),"Preserved phone draft");
    assert.equal(await rows.first().getAttribute("aria-checked"),"true");
    assert.equal(await page.getByPlaceholder("Type your own answer…").inputValue(),"A preserved custom option");
   }
  });
 }
 await run("ask-keyboard",{width:390,height:844},async page=>{
  const input=page.locator('[data-testid="thinking-field"] textarea');await input.fill("A focused draft that remains available when the software keyboard opens.");
  await page.setViewportSize({width:390,height:420});await page.waitForTimeout(350);await geometry(page);
  assert.ok(await page.getByRole("button",{name:"Submit answer"}).evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight));
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);await geometry(page);assert.ok((await input.inputValue()).startsWith("A focused draft"));
 });
 await run("ask-overlaykeyboard",{width:390,height:844},async page=>{
  await page.locator('[data-testid="thinking-field"] textarea').fill("Focused with an overlaid keyboard");
  await page.evaluate(()=>{Object.defineProperty(visualViewport,"height",{value:420,configurable:true});Object.defineProperty(visualViewport,"offsetTop",{value:18,configurable:true});visualViewport.dispatchEvent(new Event("resize"));visualViewport.dispatchEvent(new Event("scroll"));});
  await page.waitForTimeout(350);
  const root=await page.locator("#root").boundingBox();assert.equal(root.height,420);assert.equal(root.y,18);
  const submit=await page.getByRole("button",{name:"Submit answer"}).boundingBox();assert.ok(submit.y+submit.height<=root.y+root.height);assert.equal(await page.evaluate(()=>scrollY),0);
 });
 await run("ask-sidebar",{width:390,height:844},async page=>{
  await page.getByRole("button",{name:"Open sidebar",exact:true}).click();
  await page.getByPlaceholder("Search…",{exact:true}).fill("Phone");
  await page.setViewportSize({width:390,height:420});await page.waitForTimeout(250);
  assert.ok(await page.getByRole("button",{name:"Dismiss sidebar"}).isVisible());assert.equal(await page.getByPlaceholder("Search…",{exact:true}).inputValue(),"Phone");assert.equal(await page.getByPlaceholder("Search…",{exact:true}).evaluate(e=>e===document.activeElement),true);
 });
 await run("quiz-draft",{width:375,height:667},async page=>{
  await page.locator('[data-testid="question-dock"] button[role=radio]').first().click();
  const thinking=page.locator('[data-testid="thinking-field"] textarea');await thinking.fill(Array(50).fill("A long preserved reasoning draft.").join("\n"));await geometry(page);
  const slider=page.locator('[data-testid="confidence-slider"]');await slider.press("ArrowRight");const confidence=await slider.inputValue();
  await page.getByRole("button",{name:"Read conversation"}).click();await page.locator('[data-testid="question-dock-bar"]').click();
  assert.equal(await slider.inputValue(),confidence);assert.equal((await thinking.inputValue()).split("\n").length,50);
 });
 await run("practice-draft",{width:375,height:667},async page=>{
  const thinking=page.locator('[data-testid="practice-thinking-field"] textarea');await thinking.fill("Preserved practice reasoning");await page.getByRole("button",{name:"Read conversation"}).click();await page.locator('[data-testid="practice-dock-bar"]').click();assert.equal(await thinking.inputValue(),"Preserved practice reasoning");
 });
 for(const height of [221,250,280,300]) await run(`quiz-landscape${height}`,{width:667,height},async page=>{
  const a=await geometry(page);await page.waitForTimeout(450);const b=await geometry(page);assert.equal(a.shellAllowance,b.shellAllowance,"short geometry must settle");assert.equal(a.short,b.short);
  assert.equal(await page.locator(".lh-sidebar").evaluate(e=>e.getBoundingClientRect().width),0,"landscape sidebar starts closed");
  await page.getByRole("button",{name:"Open sidebar",exact:true}).click();
  assert.equal(await page.locator(".lh-sidebar").evaluate(e=>getComputedStyle(e).position),"absolute");
  await page.getByRole("button",{name:"Dismiss sidebar"}).click();
  await page.locator(".lh-dock-block").evaluate(e=>e.scrollTop=e.scrollHeight);
  await page.getByRole("button",{name:"Submit answer"}).scrollIntoViewIfNeeded();assert.ok(await page.getByRole("button",{name:"Submit answer"}).isVisible());
 });
 await run("connection-focus",{width:375,height:667},async page=>{
  await page.getByLabel("Access token").fill("synthetic token");await page.setViewportSize({width:375,height:300});await page.waitForTimeout(250);
  await page.getByRole("button",{name:"Connect",exact:true}).scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(()=>scrollY),0);assert.equal(await page.getByLabel("Access token").inputValue(),"synthetic token");
 });
 await run("setup-focus",{width:375,height:667},async page=>{
  await page.getByRole("button",{name:"Provider",exact:true}).click();await page.getByRole("button",{name:"Fixture provider"}).click();
  const key=page.locator('[data-testid="setup-key-input"]');assert.notEqual(await page.evaluate(()=>document.activeElement?.getAttribute("data-testid")),"setup-key-input");
  await key.fill("synthetic key");await page.setViewportSize({width:375,height:300});await page.waitForTimeout(250);await page.locator('[data-testid="setup-key-save"]').scrollIntoViewIfNeeded();
  const bounds=await page.locator('[data-testid="setup-dialog"]').boundingBox();assert.ok(bounds.y>=0&&bounds.y+bounds.height<=301);assert.equal(await page.evaluate(()=>scrollY),0);
 });
 await run("new-autofocus",{width:390,height:844},async page=>{assert.notEqual(await page.evaluate(()=>document.activeElement?.tagName),"TEXTAREA");});
 await run("quiz-desktop",{width:1440,height:1000},async page=>{
  assert.equal(await page.locator(".lh-read-conversation").isVisible(),false);
  await page.getByRole("button",{name:"synthetic-model",exact:true}).click();
  const menu=page.locator('[data-testid="model-menu"]');await menu.waitFor();const bounds=await menu.boundingBox();assert.ok(bounds.y>=0&&bounds.y+bounds.height<=1000);
 },true);
 await writeFile(`${output}/evidence.json`,JSON.stringify(evidence,null,2));console.log(JSON.stringify({passed:evidence.length,output},null,2));
} finally {await browser.close();}
