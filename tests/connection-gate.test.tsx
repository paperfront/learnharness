import React, { act } from 'react';
import assert from 'node:assert/strict';
import { test, afterEach } from 'node:test';
import { createRoot, type Root } from 'react-dom/client';
import { parseHTML } from 'linkedom';
import { ConnectionGate } from '../components/connection-gate.tsx';
import { clearConnectionConfig, getConnectionConfig } from '../lib/api-client.ts';
import type { ConnectionStorage } from '../lib/connection-storage.ts';
const dom=parseHTML('<html><body></body></html>');
Object.assign(globalThis,{React,window:dom.window,document:dom.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
const config={serverUrl:'https://learning.example',token:'saved-token'};
let root:Root|undefined; let host:HTMLElement|undefined;
async function mount(storage:ConnectionStorage) {
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root!.render(<ConnectionGate required storage={storage}><span>Connected content</span></ConnectionGate>));
}
async function unmount() {await act(async()=>root?.unmount());host?.remove();root=undefined;host=undefined;}
afterEach(async()=>{await unmount();clearConnectionConfig();});
test('cold launch restores before mounting content; disconnect deletes saved connection across relaunch',async()=>{
 let saved:typeof config|null=config;let reads=0;
 const storage={read:async()=>{reads++;return saved;},save:async()=>{},clear:async()=>{saved=null;}};
 await mount(storage);
 assert.deepEqual(getConnectionConfig(),config);assert.match(host!.textContent!,/Connected content/);
 await act(async()=>host!.querySelector('button')!.click());
 assert.equal(getConnectionConfig(),null);assert.equal(saved,null);assert.match(host!.textContent!,/Connect to LearnHarness/);
 await unmount();await mount(storage);
 assert.equal(reads,2);assert.equal(getConnectionConfig(),null);assert.doesNotMatch(host!.textContent!,/Connected content/);
});
test('failed Keychain deletion reports an error and keeps Disconnect available',async()=>{
 await mount({read:async()=>config,save:async()=>{},clear:async()=>{throw new Error('native detail');}});
 await act(async()=>host!.querySelector('button')!.click());
 assert.deepEqual(getConnectionConfig(),config);
 assert.match(host!.querySelector('[role=alert]')!.textContent!,/Could not remove/);
 assert.doesNotMatch(host!.textContent!,/native detail/);
 assert.equal(host!.querySelector('button')!.disabled,false);
});
test('unmount cancels delayed restoration so a stale read cannot reconnect',async()=>{
 let resolve!:(value:typeof config)=>void;
 await mount({read:()=>new Promise(done=>{resolve=done;}),save:async()=>{},clear:async()=>{}});
 assert.match(host!.textContent!,/Connecting/);
 await unmount();await act(async()=>resolve(config));assert.equal(getConnectionConfig(),null);
});
test('failed Keychain read permits retry without erasing saved credentials',async()=>{
 let tries=0;
 await mount({read:async()=>{if (++tries===1) throw new Error('locked');return config;},save:async()=>{},clear:async()=>{throw new Error('must not erase');}});
 assert.match(host!.textContent!,/Could not read/);
 const retry=[...host!.querySelectorAll('button')].find(b=>b.textContent==='Retry saved connection')!;
 await act(async()=>retry.click());assert.deepEqual(getConnectionConfig(),config);assert.match(host!.textContent!,/Connected content/);
});
