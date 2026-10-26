// One command starts an isolated synthetic fixture, runs checks, and cleans up.
import {spawn} from "node:child_process";
import {setTimeout as delay} from "node:timers/promises";
const fixtureURL=`http://127.0.0.1:${process.env.LH_FIXTURE_PORT ?? 4317}`;
const server=spawn(process.execPath,["node_modules/vite/bin/vite.js","--config","tests/mobile-fixture/vite.config.ts"],{stdio:"inherit",env:{...process.env,LH_FIXTURE_AUTOMATED:"1"}});
let serverExited=false;
server.on("exit",()=>{serverExited=true;});
async function run(file) {
 const child=spawn(process.execPath,[file],{stdio:"inherit",env:process.env});
 const code=await new Promise((resolve,reject)=>{child.on("error",reject);child.on("exit",resolve);});
 if(code!==0) throw new Error(`${file} exited ${code}`);
}
try {
 let ready=false;
 for(let attempt=0;attempt<100;attempt++) {
  if(serverExited) throw new Error("Fixture server exited before readiness (fixture port must be unused)");
  try {const response=await fetch(fixtureURL);ready=response.ok;} catch {}
  if(ready) break;
  await delay(100);
 }
 if(!ready) throw new Error("Fixture did not start in 10 seconds");
 // Ensure a conflicting pre-existing process cannot satisfy readiness.
 await delay(250);
 if(serverExited) throw new Error("Fixture server could not acquire its port");
 for(const name of ["verify.mjs","verify-new-session.mjs", "verify-submission.mjs"]) {
  await run(`tests/mobile-fixture/${name}`);
 }
} finally {server.kill("SIGTERM");}
