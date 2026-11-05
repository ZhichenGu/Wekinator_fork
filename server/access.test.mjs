import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createAccessGate} from './access.mjs';
test('website gate protects assets, accepts the default password, rejects forgery and supports logout',async()=>{
  const gate=createAccessGate({password:'0000',secret:'test-secret'});
  const server=http.createServer((req,res)=>void gate(req,res,()=>{res.end('protected app');}));
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
  try{
    assert.match(await (await fetch(url)).text(),/访问验证/);
    assert.equal((await fetch(url+'/src/main.tsx')).status,401);
    assert.equal((await fetch(url+'/auth/login',{method:'POST',body:'password=wrong'})).status,401);
    const login=await fetch(url+'/auth/login',{method:'POST',body:'password=0000',redirect:'manual'});
    assert.equal(login.status,303);const cookie=login.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Strict/);
    const session=cookie.split(';')[0];assert.equal(await(await fetch(url,{headers:{cookie:session}})).text(),'protected app');
    const forged=session.slice(0,-1)+(session.endsWith('a')?'b':'a');assert.equal((await fetch(url+'/assets/app.js',{headers:{cookie:forged}})).status,401);
    assert.equal((await fetch(url+'/auth/logout',{method:'POST',headers:{cookie:session,origin:'https://other.example'},redirect:'manual'})).status,403);
    const logout=await fetch(url+'/auth/logout',{method:'POST',headers:{cookie:session},redirect:'manual'});assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);assert.equal((await fetch(url+'/assets/app.js',{headers:{cookie:session}})).status,401);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('repeated wrong passwords are throttled without exposing the password in the login page',async()=>{
  const gate=createAccessGate({password:'only-in-server',secret:'test'});const server=http.createServer((req,res)=>void gate(req,res,()=>res.end('private')));
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
  try{
    assert.doesNotMatch(await(await fetch(url)).text(),/only-in-server/);
    for(let i=0;i<15;i++)assert.equal((await fetch(url+'/auth/login',{method:'POST',body:'password=bad'})).status,401);
    assert.equal((await fetch(url+'/auth/login',{method:'POST',body:'password=bad'})).status,429);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('login language switch translates errors and labels without weakening access',async t=>{
 const gate=createAccessGate({password:'0000',secret:'language-test'});const server=http.createServer((req,res)=>void gate(req,res,()=>{res.end('protected');}));server.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>{server.closeAllConnections();server.close();});const base='http://127.0.0.1:'+server.address().port;
 const page=await fetch(base+'/?lang=en');assert.match(page.headers.get('set-cookie'),/ui_lang=en/);const html=await page.text();assert.match(html,/Access verification/);assert.match(html,/lang="en"/);assert.match(html,/English/);
 const bad=await fetch(base+'/auth/login?lang=en',{method:'POST',body:'password=bad',redirect:'manual'});assert.equal(bad.status,401);assert.match(await bad.text(),/Incorrect password/);
 const asset=await fetch(base+'/assets/private.js?lang=en');assert.equal(asset.status,401);
});
