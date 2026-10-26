import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createConnectionStorage } from '../lib/connection-storage.ts';
const config = {serverUrl:'https://learning.example',token:'saved-token'};
test('connection record survives a fresh storage instance and is deleted as one record', async () => {
 let record: unknown = null;
 const backend = {get:async()=>record,set:async(value:string)=>{record=value;},remove:async()=>{record=null;}};
 await createConnectionStorage(backend).save({...config,serverUrl:config.serverUrl+'/'});
 assert.deepEqual(await createConnectionStorage(backend).read(),config);
 await createConnectionStorage(backend).clear();
 assert.equal(await createConnectionStorage(backend).read(),null);
});
test('invalid stored URLs, shapes and versions are never restored', async () => {
 for (const record of ['bad json', JSON.stringify({version:2,...config}), JSON.stringify({version:1,...config,serverUrl:'http://evil.example'}), JSON.stringify({version:1,serverUrl:config.serverUrl}), {}]) {
  const storage=createConnectionStorage({get:async()=>record,set:async()=>{},remove:async()=>{}});
  await assert.rejects(storage.read());
 }
});
test('storage errors propagate without falling back to browser persistence', async () => {
 const fail=async()=>{throw new Error('Keychain unavailable');};
 const storage=createConnectionStorage({get:fail,set:fail,remove:fail});
 await assert.rejects(storage.read()); await assert.rejects(storage.save(config)); await assert.rejects(storage.clear());
});
test('web preview does not enable native credential persistence', async () => {
 const { iosConnectionStorage } = await import('../mobile/connection-storage.ts');
 assert.equal(iosConnectionStorage,undefined);
});
