import test from 'node:test';
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import http from 'node:http';
import {encodeMessage} from './serial';
import {validateMqttMessage} from './mqtt-output';
import {CoordinateSampler,coordinateOsc,coordinateText} from './coordinates';
// @ts-ignore Downloadable bridge uses the same implementation as desktop.
import {createOscReceiver} from '../public/examples/platform_osc_bridge.mjs';
test('two named hands pass the OSC bridge into an independent UDP receiver',async()=>{
 const udp=dgram.createSocket('udp4');
 await new Promise<void>(resolve=>udp.bind(0,'127.0.0.1',resolve));
 const packets:Buffer[]=[];udp.on('message',packet=>packets.push(packet));
 const bridge=createOscReceiver();
 const server=http.createServer((req,res)=>void bridge.handle(req,res,false,true));
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const config={handMode:'dual' as const,points:[8,29],axes:'xy' as const,hz:10,smoothing:0,named:true};
 const sampler=new CoordinateSampler('hand',config);
 const input=Array.from({length:42},(_,id)=>({x:id<21?.2:.8,y:.4,z:.1}));
 try{
   for(const [now,points] of [[0,input],[100,input.map((point,id)=>id<21?{x:NaN,y:NaN,z:NaN}:point)],[200,[]],[300,input]] as const){
     const frame=sampler.step([...points],now).frame;
     if(now===200){assert.equal(frame,null);continue;}
     assert.ok(frame);
     const text=coordinateText(frame,config);
     assert.equal(new TextDecoder().decode(encodeMessage({text,lineEnding:'lf'})),text+'\n');
     validateMqttMessage({topic:'platform/coordinates',payload:text,qos:0});
     const values=JSON.parse(text).values;
     assert.equal(values.right_index_tip_x,.2);
     if(now===100)assert.equal(values.left_index_tip_x,undefined);
     else assert.equal(values.left_index_tip_x,.8);
     const response=await fetch('http://127.0.0.1:'+(server.address() as import('node:net').AddressInfo).port,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({host:'127.0.0.1',port:udp.address().port,address:'/platform/hand',points:coordinateOsc(frame,config)})});
     assert.equal(response.status,204);
   }
   await new Promise<void>((resolve,reject)=>{const began=Date.now();const poll=()=>packets.length===10?resolve():Date.now()-began>1000?reject(Error('Missing UDP packets')):setTimeout(poll,10);poll();});
   const addresses=packets.map(packet=>packet.subarray(0,packet.indexOf(0)).toString());
   assert.equal(addresses.filter(a=>a==='/platform/hand/left_index_tip/x').length,2);
   assert.equal(addresses.filter(a=>a==='/platform/hand/right_index_tip/x').length,3);
   for(const [index,address] of addresses.entries()){
     if(address.endsWith('/x'))assert.ok(Math.abs(packets[index].readFloatBE(packets[index].length-4)-(address.includes('left_')?.8:.2))<.00001);
   }
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));bridge.close();udp.close();}
});
