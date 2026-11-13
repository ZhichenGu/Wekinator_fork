import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import dgram from 'node:dgram';
import {cleanCoordinateConfig,CoordinateSampler,coordinateOsc,coordinateText,coordinateName,selectCoordinatePoints,switchCoordinateHands} from './coordinates';
import {validateProject} from './core';
import {CoordinateHands} from './coordinate-hands';
import {validateCoordinatePayload} from './coordinate-payload';
import {SerialConnection,type DevicePort,encodeMessage} from './serial';
import {MqttConnection,type MqttPeer,validateMqttMessage} from './mqtt-output';
// @ts-ignore The downloadable bridge also implements the desktop receiver.
import {createOscReceiver} from '../public/examples/platform_osc_bridge.mjs';
const points=Array.from({length:42},(_,id)=>({x:.1+id/100,y:.23456,z:-.12345}));
const config=cleanCoordinateConfig('hand',{handMode:'dual',points:points.map((_,id)=>id),axes:'xyz',hz:10,smoothing:0,named:true});
const frame=()=>new CoordinateSampler('hand',config).step(points,100).frame!;

test('full-hand presets preserve existing channel names and avoid default-name collisions',()=>{
 for(const handMode of ['single','dual'] as const){
   const original=cleanCoordinateConfig('hand',{...config,handMode,points:[8,4],names:{8:handMode==='dual'?'left_wrist':'wrist',4:handMode==='dual'?'left_point_0':'point_0'}});
   const all=selectCoordinatePoints('hand',original,Array.from({length:handMode==='dual'?42:21},(_,id)=>id));
   assert.equal(all.names?.[8],original.names?.[8]);assert.equal(all.names?.[4],original.names?.[4]);
   assert.equal(all.names?.[0],handMode==='dual'?'left_point_0_1':'point_0_1');
   assert.equal(new Set(all.points.map(id=>coordinateName('hand',id,all))).size,all.points.length);
   const text=coordinateText(new CoordinateSampler('hand',all).step(points,100).frame!,all);
   assert.equal(Object.keys(JSON.parse(text).values).length,all.points.length*3);
   assert.doesNotThrow(()=>validateCoordinatePayload(text));
 }
 // Replacement can introduce the same collision as adding a new point.
 const before=cleanCoordinateConfig('hand',{...config,handMode:'single',points:[4,8],names:{4:'wrist'}});
 assert.equal(selectCoordinatePoints('hand',before,[4,0]).names?.[0],'point_0');
});

test('21/42 point profiles, custom names, hand choice and axes survive repeated project reopen',()=>{
 const single=cleanCoordinateConfig('hand',{...config,handMode:'single',hand:'right',points:config.points.slice(0,21),names:{0:'pitch',8:'control'},named:false});
 let current=switchCoordinateHands(single,'dual');
 current=selectCoordinatePoints('hand',current,config.points);
 current=cleanCoordinateConfig('hand',{...current,names:{...current.names,8:'left_pitch',29:'right_volume'},enabledAxes:['x','z']});
 const dual=current;
 for(let turn=0;turn<4;turn++){
   current=switchCoordinateHands(current,'single');
   assert.deepEqual(current.points,single.points);assert.deepEqual(current.names,single.names);assert.equal(current.named,false);assert.equal(current.hand,'right');
   assert.deepEqual(JSON.parse(coordinateText(new CoordinateSampler('hand',current).step(points,100).frame!,current)).points.length,21);
   const project={schemaVersion:1,name:'Full hand reopen',mode:'hand',feature:'shape',learning:'coordinates',coordinates:current,actions:[{id:'output',name:'Coordinates',effect:'indicator',color:'#bcd7ff',samples:[],trained:false,threshold:.7}],updatedAt:new Date().toISOString()};
   current=validateProject(JSON.parse(JSON.stringify(project))).coordinates!;
   current=switchCoordinateHands(current,'dual');
   assert.deepEqual(current.points,dual.points);assert.deepEqual(current.names,dual.names);assert.deepEqual(current.enabledAxes,['x','z']);
   const text=coordinateText(new CoordinateSampler('hand',current).step(points,100).frame!,current);
   assert.equal(Object.keys(JSON.parse(text).values).length,84);assert.equal(JSON.parse(text).values.left_pitch_y,undefined);
 }
});

test('full-hand tracking pauses only the missing hand and resumes all 21 points without old smoothing',()=>{
 const tracker=new CoordinateHands(),sampler=new CoordinateSampler('hand',{...config,smoothing:.7});
 const detected=(entries:[string,number][])=>({landmarks:entries.map(([,x])=>Array.from({length:21},()=>({x,y:.4,z:.1}))),handedness:entries.map(([categoryName])=>[{categoryName,score:.99}])});
 const sample=(entries:[string,number][],time:number)=>sampler.step(tracker.step(detected(entries),'any',true,time),time).frame;
 assert.equal(sample([['Left',.2],['Right',.8]],0)?.points.length,42);
 const right=sample([['Right',.8]],100)!;
 assert.equal(right.points.length,21);assert.ok(right.points.every(p=>p.id>=21));
 assert.equal(Object.keys(JSON.parse(coordinateText(right,config)).values).length,63);
 const returned=sample([['Right',.8],['Left',.4]],200)!;
 assert.equal(returned.points.length,42);assert.equal(returned.points.find(p=>p.id===8)?.x,.6);
 assert.equal(sample([['Left',.5],['Right',.51]],300),null);
 const restored=sample([['Left',.2],['Right',.8]],400)!;
 assert.equal(restored.points.length,42);assert.equal(restored.points.find(p=>p.id===8)?.x,.8);
});

test('single and dual full-hand frames retain every axis and reject oversized selections',()=>{
 const single=cleanCoordinateConfig('hand',{...config,handMode:'single',points:config.points.slice(0,21)});
 assert.equal(new CoordinateSampler('hand',single).step(points,100).frame?.points.length,21);
 assert.throws(()=>cleanCoordinateConfig('hand',{...single,points:config.points}));
 const text=coordinateText(frame(),config);assert.equal(Object.keys(JSON.parse(text).values).length,126);
 assert.ok(text.length>512);assert.doesNotThrow(()=>validateCoordinatePayload(text));
 assert.throws(()=>encodeMessage({text,lineEnding:'lf'}));
 assert.throws(()=>validateMqttMessage({topic:'platform/coordinates',payload:text,qos:0}));
 assert.throws(()=>validateCoordinatePayload(JSON.stringify({mode:'hand',t:0,values:{bad_x:'0.2'}})));
 assert.throws(()=>validateCoordinatePayload(JSON.stringify({mode:'hand',t:0,points:[null]})));
 assert.throws(()=>validateCoordinatePayload(JSON.stringify({mode:'hand',t:0,values:Object.fromEntries(Array.from({length:127},(_,i)=>['point_'+i+'_x',.5]))})));
});

test('Serial and MQTT coordinate paths send all 42 landmarks while ordinary message limits remain',async()=>{
 const single=cleanCoordinateConfig('hand',{...config,handMode:'single',points:config.points.slice(0,21)});
 const sampler=new CoordinateSampler('hand',config);
 const frames=[
   coordinateText(new CoordinateSampler('hand',single).step(points,0).frame!,single),
   coordinateText(sampler.step(points,100).frame!,config),
   coordinateText(sampler.step(points.map((p,id)=>id<21?{x:NaN,y:NaN,z:NaN}:p),200).frame!,config),
   coordinateText(sampler.step(points,300).frame!,config)
 ];
 assert.deepEqual(frames.map(text=>Object.keys(JSON.parse(text).values).length),[63,126,63,126]);
 const writes:Uint8Array[]=[];
 class Port extends EventTarget implements DevicePort {
   writable=new WritableStream<Uint8Array>({write:bytes=>{writes.push(bytes);}});
   getInfo(){return {};}
   async open(){} async close(){}
 }
 const serial=new SerialConnection();await serial.connect(new Port(),115200);
 for(const text of frames)await serial.send({text,lineEnding:'lf'},true);
 assert.deepEqual(writes.map(bytes=>new TextDecoder().decode(bytes)),frames.map(text=>text+'\n'));await serial.disconnect();
 const published:string[]=[];
 const handlers:Record<string,(...args:unknown[])=>void>={};
 const peer:MqttPeer={connected:true,on(event,fn){handlers[event]=fn;return this;},connect(){handlers.connect();},end(){},publish(topic,payload,options,callback){published.push(payload);assert.equal(options.retain,false);callback();}};
 const mqtt=new MqttConnection(async()=>peer);
 await mqtt.connect({url:'ws://localhost:9001',username:'',clientId:'',passwordRequired:false},'',()=>{});
 for(const text of frames)await mqtt.send({topic:'platform/coordinates',payload:text,qos:0},true);
 assert.deepEqual(published,frames);mqtt.disconnect();
});

test('OSC bridge emits all 126 named floats for a full two-hand frame',async()=>{
 const udp=dgram.createSocket('udp4');await new Promise<void>(resolve=>udp.bind(0,'127.0.0.1',resolve));
 const packets:Buffer[]=[];udp.on('message',buffer=>packets.push(buffer));
 const bridge=createOscReceiver();const server=http.createServer((req,res)=>void bridge.handle(req,res,false,true));
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
   const payload={host:'127.0.0.1',port:udp.address().port,address:'/platform/hand',points:coordinateOsc(frame(),config)};
   const response=await fetch('http://127.0.0.1:'+(server.address() as import('node:net').AddressInfo).port,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
   assert.equal(response.status,204);
   await new Promise<void>((resolve,reject)=>{const began=Date.now();const poll=()=>packets.length===126?resolve():Date.now()-began>1500?reject(Error('Incomplete coordinates')):setTimeout(poll,10);poll();});
   const addresses=packets.map(packet=>packet.subarray(0,packet.indexOf(0)).toString());
   assert.equal(new Set(addresses).size,126);
   assert.ok(addresses.includes('/platform/hand/left_index_tip/x'));
   assert.ok(addresses.includes('/platform/hand/right_pinky_tip/z'));
   const expected=new Map(coordinateOsc(frame(),config).flatMap(point=>point.axes!.map((axis,index)=>['/platform/hand/'+point.name+'/'+axis,point.values[index]] as const)));
   for(const packet of packets){
     const address=packet.subarray(0,packet.indexOf(0)).toString();
     assert.ok(Math.abs(packet.readFloatBE(packet.length-4)-expected.get(address)!)<.00001,address);
   }
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));bridge.close();udp.close();}
});
