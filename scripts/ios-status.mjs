// Read-only App Store Connect diagnostics; never print keys, JWTs or tester identities.
import { createPrivateKey, sign } from 'node:crypto';
const env = process.env;
for (const name of ['ASC_KEY_ID', 'ASC_ISSUER_ID', 'ASC_PRIVATE_KEY']) {
 if (!env[name]) throw new Error(`Missing ${name}`);
}
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const content = `${encode({alg:'ES256',kid:env.ASC_KEY_ID,typ:'JWT'})}.${encode({iss:env.ASC_ISSUER_ID,iat:now,exp:now+300,aud:'appstoreconnect-v1'})}`;
const signature = sign('sha256', Buffer.from(content), {key:createPrivateKey(env.ASC_PRIVATE_KEY),dsaEncoding:'ieee-p1363'}).toString('base64url');
const jwt = `${content}.${signature}`;
async function get(path, params = {}) {
 const url = new URL(path, 'https://api.appstoreconnect.apple.com');
 for (const [key,value] of Object.entries(params)) url.searchParams.set(key,value);
 const response = await fetch(url, {headers:{Authorization:`Bearer ${jwt}`},signal:AbortSignal.timeout(30000)});
 if (!response.ok) throw new Error(`Apple read failed: ${response.status} at ${path}`);
 return response.json();
}
const apps = await get('/v1/apps', {'filter[bundleId]':'com.paperfront.learnharness'});
if (apps.data.length !== 1) throw new Error('Expected one registered app');
const app = apps.data[0];
console.log(JSON.stringify({appId:app.id,name:app.attributes.name}));
const builds = await get('/v1/builds', {'filter[app]':app.id,sort:'-uploadedDate',limit:'5'});
for (const build of builds.data) {
 const details = await get(`/v1/builds/${build.id}/buildBetaDetail`);
 console.log(JSON.stringify({buildId:build.id,...Object.fromEntries(['version','uploadedDate','processingState','expired','usesNonExemptEncryption'].map(k=>[k,build.attributes[k]])),beta:details.data.attributes}));
}
const groups = await get('/v1/betaGroups', {'filter[app]':app.id,limit:'50'});
for (const group of groups.data) {
 const assigned = await get(`/v1/betaGroups/${group.id}/builds`, {limit:'50'});
 console.log(JSON.stringify({groupId:group.id,name:group.attributes.name,isInternalGroup:group.attributes.isInternalGroup,hasAccessToAllBuilds:group.attributes.hasAccessToAllBuilds,builds:assigned.data.map(b=>({id:b.id,version:b.attributes.version}))}));
}
