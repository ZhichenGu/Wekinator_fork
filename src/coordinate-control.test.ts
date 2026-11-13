import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import dgram from 'node:dgram';
import {CoordinateHands,coordinateHandSide,type HandDetection} from './coordinate-hands';
import {CoordinateSampler,createCoordinates,lockCoordinateScope,coordinateText,coordinateOsc,selectCoordinatePoints,type CoordinateConfig,type CoordinateFrame} from './coordinates';
import {validateProject,type Project} from './core';
import {encodeMessage} from './serial';
import {validateMqttMessage} from './mqtt-output';
// @ts-ignore The web bridge and desktop receiver share this implementation.
import {createOscReceiver} from '../public/examples/platform_osc_bridge.mjs';
const hand=(x:number)=>Array.from({length:21},(_,id)=>({x:x+(id%4)*.005,y:.5,z:.1}));
const detected=(sides:string[],uncertain?:string):HandDetection=>({landmarks:sides.map(side=>hand(side==='Left'?.2:.8)),handedness:sides.map(categoryName=>[{categoryName,score:categoryName===uncertain?.5:.99}])});

test('automatic single-hand control can replace a hand at the old controller position',()=>{
 for(const first of ['Left','Right']){
   const second=first==='Left'?'Right':'Left';
   const tracker=new CoordinateHands(),config={...createCoordinates('hand'),smoothing:.7,names:{8:'pitch'}};
   const sampler=new CoordinateSampler('hand',config);
   const step=(entries:[string,number][],t:number)=>{
     const input=tracker.step({landmarks:entries.map(([,x])=>hand(x)),handedness:entries.map(([categoryName])=>[{categoryName,score:.99}])},'any',false,t);
     return {side:coordinateHandSide(input),...sampler.step(input,t)};
   };
   assert.equal(step([[first,.2]],0).side,first.toLowerCase());
   assert.equal(step([[first,.2],[second,.8]],100).side,first.toLowerCase());
   for(const t of [200,300,400])assert.equal(step([[second,.25]],t).frame,null);
   const changed=step([[second,.25]],500);assert.equal(changed.side,second.toLowerCase());
   assert.equal(JSON.parse(coordinateText(changed.frame!,config)).values.pitch_x,.75);
   assert.equal(step([[first,.7],[second,.25]],600).side,second.toLowerCase());
 }
});

test('a lone controller can recover in the departed hand position without restarting the camera',()=>{
 const tracker=new CoordinateHands();
 tracker.step(detected(['Left','Right']),'any',false,0);
 const lone={landmarks:[hand(.8)],handedness:[[{categoryName:'Left',score:.99}]]};
 for(const now of [100,200,300])assert.equal(tracker.step(lone,'any',false,now).length,0);
 assert.equal(coordinateHandSide(tracker.step(lone,'any',false,400)),'left');
 assert.equal(coordinateHandSide(tracker.step(lone,'any',false,500)),'left');
});

test('single-hand ambiguity recovery requires uninterrupted evidence and never preempts a returning controller',()=>{
 const tracker=new CoordinateHands();
 tracker.step(detected(['Right']),'any',false,0);
 tracker.step(detected(['Right','Left']),'any',false,100);
 const replacement={landmarks:[hand(.8)],handedness:[[{categoryName:'Left',score:.99}]]};
 assert.equal(tracker.step(replacement,'any',false,200).length,0);
 assert.equal(tracker.step(replacement,'any',false,400).length,0);
 assert.equal(coordinateHandSide(tracker.step(detected(['Left','Right']),'any',false,450)),'right');
 for(const now of [500,600])assert.equal(tracker.step(replacement,'any',false,now).length,0);
 assert.equal(tracker.step(detected([]),'any',false,700).length,0);
 for(const now of [800,1000])assert.equal(tracker.step(replacement,'any',false,now).length,0);
 const lowConfidence={...replacement,handedness:[[{categoryName:'Left',score:.5}]]};
 assert.equal(tracker.step(lowConfidence,'any',false,1050).length,0);
 for(const now of [1100,1300])assert.equal(tracker.step(replacement,'any',false,now).length,0);
 assert.equal(tracker.step(replacement,'any',false,NaN).length,0);
 for(const now of [1400,1600])assert.equal(tracker.step(replacement,'any',false,now).length,0);
 assert.equal(coordinateHandSide(tracker.step(replacement,'any',false,1700)),'left');
 assert.equal(coordinateHandSide(tracker.step(detected(['Right','Left']),'any',false,1800)),'left');
});

test('reopened automatic 21-point projects keep protocol fields and start afresh with either available hand',()=>{
 const coordinates={...selectCoordinatePoints('hand',createCoordinates('hand'),Array.from({length:21},(_,id)=>id)),names:{8:'pitch'},enabledAxes:['x','z'] as ('x'|'z')[],smoothing:0};
 const original:Project={schemaVersion:1,name:'Automatic round trip',mode:'hand',feature:'shape',learning:'coordinates',coordinates,actions:[{id:'output',name:'Coordinates',effect:'indicator',color:'#bcd7ff',trained:false,threshold:.7,samples:[]}],updatedAt:new Date().toISOString()};
 const saved=validateProject(JSON.parse(JSON.stringify(original)));
 const config:CoordinateConfig=lockCoordinateScope('hand',saved.coordinates!);
 assert.deepEqual(config,coordinates);
 for(const side of ['Right','Left']){
   const tracker=new CoordinateHands(),sampler:CoordinateSampler=new CoordinateSampler('hand',config);
   const frame:CoordinateFrame=sampler.step(tracker.step(detected([side]),'any',false,0),0).frame!;
   assert.equal(frame.points.length,21);
   const text=coordinateText(frame,config),values=JSON.parse(text).values;
   assert.equal(Object.keys(values).length,42);
   assert.equal(values.pitch_x,side==='Right'?.2:.8);
   assert.equal(new TextDecoder().decode(encodeMessage({text,lineEnding:'lf'},true)),text+'\n');
   assert.doesNotThrow(()=>validateMqttMessage({topic:'platform/coordinates',payload:text,qos:0},true));
   assert.deepEqual(coordinateOsc(frame,config).find(p=>p.name==='pitch')?.values,[values.pitch_x,values.pitch_z]);
 }
});

test('single any-hand remembers its controller through empty and uncertain frames, then hands over deliberately',()=>{
 const tracker=new CoordinateHands(),sampler=new CoordinateSampler('hand',{...createCoordinates('hand'),smoothing:0});
 const step=(sides:string[],t:number,uncertain?:string)=>{const input=tracker.step(detected(sides,uncertain),'any',false,t);const result=sampler.step(input,t);assert.ok(!result.frame||result.frame.points.length<=21);return {side:coordinateHandSide(input),...result};};
 assert.equal(step(['Right'],0).side,'right');
 assert.equal(step(['Left','Right'],100).side,'right');
 assert.equal(step([],200).frame,null);
 assert.equal(step(['Right','Left'],300).side,'right');
 assert.equal(step(['Left','Right'],400,'Right').frame,null);
 assert.equal(step(['Left','Right'],500).side,'right');
 assert.equal(step(['Left'],600).frame,null);
 assert.equal(step(['Left'],800).frame,null);
 assert.equal(step(['Left'],900).side,'left');
 assert.equal(step(['Right','Left'],1000).side,'left');
 assert.equal(step([],1100).frame,null);
 assert.equal(step([],2300).frame,null);
 assert.equal(step(['Right','Left'],2400).side,'left');
});

test('fixed-side single projects never output the other hand, and either follows the currently used fixed hand',()=>{
 for(const side of ['left','right'] as const){
   const tracker=new CoordinateHands(),sampler=new CoordinateSampler('hand',{...createCoordinates('hand'),hand:side,smoothing:0});
   const name=side==='left'?'Left':'Right',other=side==='left'?'Right':'Left';
   assert.equal(sampler.step(tracker.step(detected([other]),side,false,0),0).frame,null);
   const own=tracker.step(detected([other,name]),side,false,100);
   assert.equal(coordinateHandSide(own),side);assert.ok(sampler.step(own,100).frame);
   assert.equal(coordinateHandSide(tracker.step(detected(['Left','Right']),'any',false,200)),side);
   assert.equal(sampler.step(tracker.step(detected([other]),side,false,300),300).frame,null);
   assert.ok(sampler.step(tracker.step(detected([name]),side,false,400),400).frame);
 }
});

test('dual either-hand rejects transient loss, retains control after output restart and never leaks the other side',()=>{
 const tracker=new CoordinateHands(),config={...createCoordinates('hand','dual'),outputHands:'any' as const,smoothing:0};
 const sampler=new CoordinateSampler('hand',config);
 const step=(sides:string[],t:number,uncertain?:string)=>{
   const result=sampler.step(tracker.step(detected(sides,uncertain),'any',true,t),t);
   if(result.frame){const sides=new Set(result.frame.points.map(p=>Math.floor(p.id/21)));assert.equal(sides.size,1);const text=coordinateText(result.frame,config);assert.doesNotThrow(()=>encodeMessage({text,lineEnding:'lf'},true));validateMqttMessage({topic:'platform/coordinates',payload:text,qos:0},true);}
   return result.frame;
 };
 assert.deepEqual(step(['Right'],0)?.points.map(p=>p.id),[29]);
 assert.deepEqual(step(['Left','Right'],100)?.points.map(p=>p.id),[29]);
 assert.equal(step(['Left'],200),null);
 assert.deepEqual(step(['Left','Right'],300)?.points.map(p=>p.id),[29]);
 sampler.reset(true);
 assert.deepEqual(step(['Left','Right'],400)?.points.map(p=>p.id),[29]);
 assert.equal(step(['Left'],500),null);
 assert.deepEqual(step(['Left'],800)?.points.map(p=>p.id),[8]);
 assert.deepEqual(step(['Right','Left'],900)?.points.map(p=>p.id),[8]);
 const overlap={landmarks:[hand(.5),hand(.51)],handedness:[[{categoryName:'Left',score:.99}],[{categoryName:'Right',score:.99}]]};
 assert.equal(sampler.step(tracker.step(overlap,'any',true,1000),1000).frame,null);
 assert.deepEqual(step(['Right','Left'],1100)?.points.map(p=>p.id),[8]);
});

test('both-hand output is independent at full 42-point capacity and restores each hand at its current value',()=>{
 const config={...selectCoordinatePoints('hand',createCoordinates('hand','dual'),Array.from({length:42},(_,id)=>id)),axes:'xyz' as const,smoothing:.7};
 const tracker=new CoordinateHands(),sampler=new CoordinateSampler('hand',config);
 const step=(sides:string[],t:number)=>sampler.step(tracker.step(detected(sides),'any',true,t),t).frame;
 assert.equal(step(['Left','Right'],0)?.points.length,42);
 const right=step(['Right'],100)!;assert.equal(right.points.length,21);assert.ok(right.points.every(p=>p.id>=21));
 assert.equal(Object.keys(JSON.parse(coordinateText(right,config)).values).length,63);
 const returned=step(['Right','Left'],200)!;assert.equal(returned.points.length,42);assert.equal(returned.points.find(p=>p.id===0)?.x,.8);
 assert.equal(step([],300),null);assert.equal(step(['Left','Right'],400)?.points.length,42);
});

test('project reopen preserves capacity and all output choices; fresh tracking starts from the available hand',()=>{
 for(const scope of ['single','dual'] as const)for(const output of scope==='single'?['left','right','any'] as const:['left','right','any','both'] as const){
   const names:Record<string,string>=scope==='single'?{8:'pitch'}:{8:'left_pitch',29:'right_volume'};
   const coordinates:CoordinateConfig={...createCoordinates('hand',scope),...(scope==='single'?{hand:output as 'left'|'right'|'any'}:{outputHands:output}),names,enabledAxes:['x','z'] as ('x'|'z')[]};
   const original:Project={schemaVersion:1,name:'Round trip',mode:'hand',feature:'shape',learning:'coordinates',coordinates,actions:[{id:'output',name:'Coordinates',effect:'indicator',color:'#bcd7ff',trained:false,threshold:.7,samples:[]}],updatedAt:new Date().toISOString()};
   const restored=validateProject(JSON.parse(JSON.stringify(original)));
   assert.deepEqual(restored.coordinates,coordinates);
 }
});

test('either-hand handover sends only its selected OSC channels to an independent UDP receiver',async()=>{
 const udp=dgram.createSocket('udp4');await new Promise<void>(resolve=>udp.bind(0,'127.0.0.1',resolve));
 const packets:Buffer[]=[];udp.on('message',packet=>packets.push(packet));
 const bridge=createOscReceiver(),server=http.createServer((req,res)=>void bridge.handle(req,res,false,true));
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const config={...createCoordinates('hand','dual'),outputHands:'any' as const,names:{8:'left_pitch',29:'right_volume'},enabledAxes:['x','z'] as ('x'|'z')[],smoothing:0};
 const tracker=new CoordinateHands(),sampler=new CoordinateSampler('hand',config);
 const steps:[number,string[],string|null][]=[[0,['Right'],'right_volume'],[100,['Left','Right'],'right_volume'],[200,['Left'],null],[300,['Left','Right'],'right_volume'],[400,['Left'],null],[550,['Left'],null],[750,['Left'],'left_pitch'],[850,['Right','Left'],'left_pitch'],[950,[],null],[1100,['Right','Left'],'left_pitch']];
 let count=0;
 try{
   for(const [now,sides,name] of steps){
     const result=sampler.step(tracker.step(detected(sides),'any',true,now),now);
     if(!name){assert.equal(result.frame,null);assert.equal(packets.length,count);continue;}
     assert.ok(result.frame);assert.equal(result.due,true);
     const response=await fetch('http://127.0.0.1:'+(server.address() as import('node:net').AddressInfo).port,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({host:'127.0.0.1',port:udp.address().port,address:'/platform/hand',points:coordinateOsc(result.frame,config)})});
     assert.equal(response.status,204);count+=2;
     await new Promise<void>((resolve,reject)=>{const start=Date.now();const poll=()=>packets.length===count?resolve():Date.now()-start>1000?reject(Error('Missing hand output')):setTimeout(poll,5);poll();});
     const received=packets.slice(-2).map(packet=>({address:packet.subarray(0,packet.indexOf(0)).toString(),value:packet.readFloatBE(packet.length-4)}));
     assert.deepEqual(received.map(p=>p.address).sort(),['/platform/hand/'+name+'/x','/platform/hand/'+name+'/z']);
     assert.ok(Math.abs(received.find(p=>p.address.endsWith('/x'))!.value-(name==='left_pitch'?.8:.2))<.00001);
   }
   assert.equal(count,12);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));bridge.close();udp.close();}
});
