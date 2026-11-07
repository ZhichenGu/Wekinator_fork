import test from 'node:test';import assert from 'node:assert/strict';import {createAccessGate} from './access.mjs';
test('guest entry retains login, issues a session, rejects cross-origin entry and supports logout',async()=>{
 const gate=createAccessGate({secret:'guest-test-secret'});
 async function request(url,method='GET',headers={}){let status,body='',responseHeaders={},passed=false;await gate({url,method,headers:{host:'localhost:5173',...headers},socket:{remoteAddress:'local'}},{writeHead:(s,h={})=>{status=s;responseHeaders=h;},end:value=>{body=value??'';}},()=>{passed=true;});return {status,body,headers:responseHeaders,passed};}
 const login=await request('/');assert.match(login.body,/name="password"/);assert.match(login.body,/访客进入/);
 assert.equal((await request('/api/objects/check','POST')).status,401);
 assert.equal((await request('/auth/guest','POST',{origin:'https://other.example'})).status,403);
 const guest=await request('/auth/guest','POST',{origin:'http://localhost:5173'});assert.equal(guest.status,303);
 const cookie=guest.headers['Set-Cookie'].split(';')[0];assert.ok((await request('/','GET',{cookie})).passed);assert.ok((await request('/api/objects/check','POST',{cookie})).passed);
 assert.equal((await request('/config/users.json','GET',{cookie})).status,404);
 await request('/auth/logout','POST',{cookie});assert.equal((await request('/api/objects/check','POST',{cookie})).status,401);
});
