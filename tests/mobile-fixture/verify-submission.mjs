// All requests are synthetic; no learner records or provider calls.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {launchBrowser, fixtureURL} from "./runtime.mjs";
const browser=await launchBrowser();
const pages=[];
const errors=[];
const artifacts=process.env.LH_MOBILE_ARTIFACTS??"/tmp/lh-mobile-validation";
await mkdir(artifacts,{recursive:true});
async function newPage(options){const page=await browser.newPage(options);pages.push(page);page.on("pageerror",e=>errors.push(e.message));return page;}
async function releaseCanonicalReadback(page) {
 await page.waitForFunction(()=>window.__fixtureReadbacks>0);
 assert.equal(await page.getByText('Synthetic assistant continuation received your answer.',{exact:true}).count(),0,'server mutation cannot alter live client state before canonical GET');
 await page.evaluate(()=>{window.__fixtureHoldReadback=false;});
}
try {
 for (const failure of [undefined,'status','network','lost-ack']) {
  const page=await newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await page.goto(`${fixtureURL}/?case=ask&submission&remote=true`);
  const custom=page.getByPlaceholder('Type your own answer…');
  const draft='I want to understand both theory and practical applications';
  await custom.tap(); await custom.fill(draft);
  await page.evaluate(()=>{window.__fixtureHoldReadback=true;});
  // Thinking intentionally remains empty, matching the reported flow.
  await page.evaluate(f=>{window.__fixtureFailure=f;},failure);
  await page.getByRole('button',{name:'Submit answer',exact:true}).tap();
  await page.waitForFunction(()=>window.__fixtureSubmissions.length===1);
  if(failure && failure!=="lost-ack") {
   await page.getByRole('alert').filter({hasText: failure==='status'?'Synthetic answer refused':'Synthetic answer network failure'}).waitFor();
   assert.equal(await custom.inputValue(),draft,'draft survives rejected POST');
   await page.evaluate(()=>{window.__fixtureFailure=undefined;});
   await page.getByRole('button',{name:'Submit answer',exact:true}).tap();
   await page.waitForFunction(()=>window.__fixtureSubmissions.length===2);
  }
  await releaseCanonicalReadback(page);
  await page.getByText('Synthetic assistant continuation received your answer.',{exact:true}).waitFor();
  const submissions=await page.evaluate(()=>window.__fixtureSubmissions);
  for(const request of submissions) {
   assert.equal(request.input.type,'answer'); assert.equal(request.input.answer.other,draft);
   assert.equal(request.input.answer.thinking,undefined);
  }
  assert.equal(await page.locator('[data-testid="question-dock"]').count(),0);
  assert.equal(submissions.length,failure && failure!=='lost-ack'?2:1,'lost acknowledgement reconciles without a duplicate request');
  console.log(`Passed custom touch submit: ${failure??'success'}`);
  await page.close();
 }
 for (const scenario of ['ask','text','asktext','mobile-text','mobile-asktext']) {
  const mobile=scenario.startsWith('mobile-');
  const kind=scenario.replace('mobile-','');
  const page=await newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:900},hasTouch:mobile,isMobile:mobile});
  await page.goto(`${fixtureURL}/?case=${kind}&submission&remote=true${mobile?'':'&desktop=true'}`);
  const field=page.getByPlaceholder(kind==='ask'?'Type your own answer…':'Type your answer…');
  await field.fill('Synthetic pointer free text answer');
  await page.evaluate(()=>{window.__fixtureHoldReadback=true;});
  if(mobile) await page.getByRole('button',{name:'Submit answer',exact:true}).tap();
  else await page.getByRole('button',{name:'Submit answer',exact:true}).click();
  await releaseCanonicalReadback(page);
  await page.getByText('Synthetic assistant continuation received your answer.',{exact:true}).waitFor();
  const [request]=await page.evaluate(()=>window.__fixtureSubmissions);
  assert.equal(request.input.answer[kind==='ask'?'other':'text'],'Synthetic pointer free text answer');
  assert.equal(await page.evaluate(()=>window.__fixtureSubmissions.length),1);
  console.log(`Passed pointer free text submit: ${scenario}`);
  await page.close();
 }
 assert.deepEqual(errors,[], 'No uncaught browser errors');
 await writeFile(`${artifacts}/submission-results.json`,JSON.stringify({passed:true,errors},null,2));
} catch(error) {
 for(const [i,page] of pages.entries()) if(!page.isClosed()) await page.screenshot({path:`${artifacts}/submission-failure-${i}.png`,fullPage:true}).catch(()=>{});
 await writeFile(`${artifacts}/submission-results.json`,JSON.stringify({passed:false,error:String(error),errors},null,2));
 throw error;
} finally {await browser.close();}
