// Synthetic fixture only: no remote requests, provider calls or learner writes.
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {pathToFileURL} from "node:url";
const require=createRequire(import.meta.url);
const path=process.env.LH_PLAYWRIGHT_MODULE ?? require.resolve("playwright-core",{paths:[process.cwd(),"/opt/homebrew/lib/node_modules/agent-browser"]});
const runtime=await import(pathToFileURL(path).href);
const {chromium}=runtime.default ?? runtime;
const browser=await chromium.launch({channel:"chrome",headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const page=await context.newPage();
const errors=[];
page.on("pageerror", error=>errors.push(error.message));
const draft="I want to learn about the muon optimizer\nincluding the mathematics and computational challenges.";
try {
 await page.goto("http://127.0.0.1:4317/?case=new&remote=true");
 const input=page.locator('[data-testid="composer"] textarea');
 await input.fill(draft);
 // Wait for provider key guards to finish loading.
 await page.waitForTimeout(500);
 for(const failure of ["network","status","invalid","json"]) {
  await page.evaluate(value=>{window.__fixtureFailure=value;},failure);
  await page.getByRole("button",{name:"Send",exact:true}).click();
  await page.getByRole("alert").waitFor();
  assert.equal(await input.inputValue(),draft);
  assert.equal(await page.getByRole("button",{name:"Send",exact:true}).isEnabled(),true);
  assert.deepEqual(await page.evaluate(()=>window.__fixtureNavigations),[]);
 }
 await page.evaluate(()=>{delete window.__fixtureFailure;});
 await page.getByRole("button",{name:"Send",exact:true}).click();
 await page.waitForFunction(()=>window.__fixtureNavigations.length===1);
 assert.deepEqual(await page.evaluate(()=>window.__fixtureNavigations),[`/chat/synthetic-created?prompt=${encodeURIComponent(draft)}`]);
 assert.equal(await page.getByRole("alert").count(),0);
 assert.equal((await page.evaluate(()=>window.__fixtureRequests)).filter(v=>v==="POST /api/chats").length,5);
 await page.goto("http://127.0.0.1:4317/?case=new&remote=true&practice=true");
 await input.fill(draft);
 await page.waitForTimeout(500);
 // Dispatch both submits within the same render, before busy can disable Send.
 await page.getByRole("button",{name:"Send",exact:true}).evaluate(button=>{button.click();button.click();});
 await page.waitForFunction(()=>window.__fixtureNavigations.length===1);
 assert.deepEqual(await page.evaluate(()=>window.__fixtureCreates),[{title:draft,kind:"practice"}]);
 assert.deepEqual(errors,[]);
 console.log("Passed real NewSession remote authenticated send, four recoverable failures, practice mode, duplicate-submit guard and retry with preserved multiline draft.");
} finally {await browser.close();}
