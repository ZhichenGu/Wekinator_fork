import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import dgram from 'node:dgram';
import {once} from 'node:events';
import {createOscReceiver} from '../public/examples/platform_osc_bridge.mjs';
test('coordinate OSC sends float vectors, rejects invalid batches and preserves scalar sends',async()=>{
 const udp=dgram.createSocket('udp4');udp.bind(0,'127.0.0.1');await once(udp,'listening');
 const receiver=createOscReceiver(),server=http.createServer((req,res)=>void receiver.handle(req,res,false,req.url==='/osc/coordinates'));
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const messages=[];udp.on('message',b=>messages.push(b));
 const url='http://127.0.0.1:'+server.address().port;
 const target={host:'127.0.0.1',port:udp.address().port,address:'/platform/hand'};
 async function post(path,payload){return fetch(url+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...target,...payload})});}
 try {
  assert.equal((await post('/osc/coordinates',{points:[{id:8,values:[.2,.6,-.1]},{id:0,values:[.5,.5,-.2]}]})).status,204);
  await new Promise(r=>setTimeout(r,20));assert.equal(messages.length,2);
  assert.ok(messages[0].includes(Buffer.from('/platform/hand/8\0')));
  assert.ok(messages[0].includes(Buffer.from(',fff\0')));
  assert.ok(Math.abs(messages[0].readFloatBE(messages[0].length-4)+.1)<1e-6);
  assert.equal((await post('/osc/coordinates',{points:[{id:8,values:[.2,'oops']}]})).status,400);
  assert.equal((await post('/osc',{value:.75})).status,204);
  await new Promise(r=>setTimeout(r,20));assert.equal(messages.length,3);
  assert.equal((await post('/osc/coordinates',{points:[{id:8,name:'index_tip',axes:['x','z'],values:[.25,-.5]}]})).status,204);
  await new Promise(r=>setTimeout(r,20));assert.equal(messages.length,5);
  assert.ok(messages[3].includes(Buffer.from('/platform/hand/index_tip/x\0')));
  assert.ok(messages[4].includes(Buffer.from('/platform/hand/index_tip/z\0')));
  assert.equal(messages[3].readFloatBE(messages[3].length-4),.25);
  assert.equal(messages[4].readFloatBE(messages[4].length-4),-.5);
  assert.equal((await post('/osc/coordinates',{points:[{id:8,name:'../bad',axes:['x'],values:[.2]}]})).status,400);

 } finally {server.closeAllConnections();await new Promise(r=>server.close(r));receiver.close();udp.close();}
});
