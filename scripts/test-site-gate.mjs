import ts from 'typescript';import vm from 'node:vm';import fs from 'node:fs';import assert from 'node:assert/strict';import {webcrypto} from 'node:crypto';import {DatabaseSync} from 'node:sqlite';
const mod={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/site-gate.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:mod,crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,Request,Response,URL,URLSearchParams,Date});
const sqlite=new DatabaseSync(':memory:');sqlite.exec(fs.readFileSync('drizzle/0000_lowly_moira_mactaggert.sql','utf8'));
const DB={prepare(sql){return {bind(...args){return {async first(){return sqlite.prepare(sql).get(...args)},async run(){return sqlite.prepare(sql).run(...args)}}}}}};
const password='Synthetic-only-password',secret='test-only-secret-'.repeat(4),env={DB,SITE_ENTRY_PASSWORD_HASH:await mod.sha256(password),SITE_ENTRY_COOKIE_SECRET:secret};
const now=Date.now(),origin='https://example.test';
const req=(path='/',options={})=>new Request(origin+path,options);
const post=(pass,ip='1.2.3.4',extra={})=>req('/site-entry?lang=en',{method:'POST',headers:{origin,'CF-Connecting-IP':ip,'Content-Type':'application/x-www-form-urlencoded',...extra},body:new URLSearchParams({password:pass})});
for(const path of ['/','/api/tracker','/api/journal','/api/photos/a','/?_rsc=test']){const r=await mod.siteGate(req(path),env,now);assert(r);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal(r.status,path.startsWith('/api/')?401:200)}
for(const lang of ['en','ur','ar']){const body=await (await mod.siteGate(req('/?lang='+lang),env,now)).text();assert(body.includes('lang="'+lang+'"'));assert(!body.includes(password))}
assert.equal((await mod.siteGate(post('wrong'),env,now)).status,401);
assert.equal((await mod.siteGate(req('/'),env,now)).headers.get('referrer-policy'),'strict-origin-when-cross-origin');
assert.equal((await mod.siteGate(post(password,'7.7.7.7',{origin:'null','sec-fetch-site':'same-origin'}),env,now)).status,303);
assert.equal((await mod.siteGate(post(password,'7.7.7.7',{origin:'null','sec-fetch-site':'cross-site'}),env,now)).status,403);
assert.equal((await mod.siteGate(post(password,'7.7.7.7',{origin:'null'}),env,now)).status,403);
assert.equal((await mod.siteGate(req('/site-entry',{method:'POST',headers:{'sec-fetch-site':'same-origin'},body:new URLSearchParams({password})}),env,now)).status,303);
assert.equal((await mod.siteGate(post(password,'2.2.2.2',{origin:'https://other.test'}),env,now)).status,403);
assert.equal((await mod.siteGate(req('/'),{},now)).status,503);
const success=await mod.siteGate(post(password),env,now);assert.equal(success.status,303);assert.equal(success.headers.get('location'),'/');
const cookie=success.headers.get('set-cookie');for(const attr of ['__Host-life_entry=','Secure','HttpOnly','SameSite=Lax','Path=/','Max-Age=43200'])assert(cookie.includes(attr));
const token=cookie.split(';')[0].split('=')[1];assert(await mod.validSession(token,secret,now));assert(!await mod.validSession(token+'x',secret,now));assert(!await mod.validSession(token,secret,now+43201*1000));assert(!await mod.validSession(token,secret+'rotated',now));
for(const path of ['/','/api/tracker','/api/journal','/api/photos/a'])assert.equal(await mod.siteGate(req(path,{headers:{cookie:cookie.split(';')[0]}}),env,now),null);
assert.equal((await mod.siteGate(req('/api/tracker',{headers:{cookie:'__Host-life_entry='+token.replace(/^./,'9')}}),env,now)).status,401);
for(let i=0;i<10;i++)assert.equal((await mod.siteGate(post('wrong','4.4.4.4'),env,now)).status,401);
const blocked=await mod.siteGate(post(password,'4.4.4.4'),env,now);assert.equal(blocked.status,429);assert.equal(blocked.headers.get('retry-after'),'900');
assert.equal((await mod.siteGate(post(password,'4.4.4.4'),env,now+16*60*1000)).status,303);
const logout=await mod.siteGate(req('/site-entry/logout',{method:'POST',headers:{origin,cookie:cookie.split(';')[0]}}),env,now);assert.equal(logout.status,303);assert(logout.headers.get('set-cookie').includes('Max-Age=0'));
assert.equal((await mod.siteGate(req('/site-entry/logout',{method:'POST',headers:{origin:'https://other.test'}}),env,now)).status,403);
// Browser gate does not change ChatGPT's existing authenticated, account-owned tool route.
assert.equal(await mod.siteGate(req('/mcp',{method:'POST',body:'{}'}),env,now),null);
const mcp={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/mcp/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:mcp,require:()=>({run:()=>{throw Error('Must not reach unauthenticated')}}),Response});assert.equal((await mcp.POST(req('/mcp',{method:'POST',body:'{}'}))).status,401);
console.log('PASS: default-deny gate, all browser/API routes, translations, missing-config failure, password validation, cross-origin rejection, secure signed cookie, tampering/expiry/key rotation, per-IP throttling/recovery, lock action and preserved authenticated ChatGPT tools');
