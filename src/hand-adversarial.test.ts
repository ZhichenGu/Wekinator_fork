import test from 'node:test';
import assert from 'node:assert/strict';
import {CoordinateHands,coordinateHandSide} from './coordinate-hands';
import {Recognizer} from './learning';
import {ContinuousController} from './continuous';
import {DwellGate,DEFAULT_REGION,regionPoint} from './region';
import {relationFrame,relationValue,DEFAULT_RELATION} from './relation';
import {type Frame,type Action,type Project,validateProject} from './core';
const frame=(t:number,u:number,handSide:'left'|'right'='left'):Frame=>({t,handSide,points:[],shape:[Math.sin(u*Math.PI),u],root:[u*.2,Math.sin(u*Math.PI)*.1],scale:.1});
const motion=Array.from({length:61},(_,i)=>frame(i*50,i/60));
const action:Action={id:'a',name:'A',effect:'indicator',color:'#ffffff',trained:true,threshold:.8,samples:[{id:'s',negative:false,duration:3000,frames:motion}]};
const project:Project={schemaVersion:1,name:'Audit',mode:'hand',feature:'both',learning:'dynamic',labBaseline:true,actions:[action],updatedAt:''};
test('dynamic recognizer accepts a full A motion but never stitches A first half to B second half',()=>{
 const full=new Recognizer(project);let fullHits=0;
 for(const f of motion)if(full.step(f,f.t).eventId)fullHits++;
 assert.equal(fullHits,1);
 const split=new Recognizer(project);let splitHits=0;
 for(const f of motion.slice(0,31))if(split.step(f,f.t).eventId)splitHits++;
 split.step(null,1550);
 for(const f of motion.slice(31)){const next={...f,t:f.t+300,handSide:'right' as const};if(split.step(next,next.t).eventId)splitHits++;}
 assert.equal(splitHits,0);
});
const cloud=(x:number,pinch=false)=>Array.from({length:21},(_,i)=>({x:x+(i%4)*.01,y:.3+Math.floor(i/4)*.04,z:0})).map((p,i)=>pinch&&i===4?{x,y:.38}:pinch&&i===8?{x:x+.01,y:.38}:p);
test('region and pinch run their actual point and relation evaluators before the dwell gate',()=>{
 for(const mode of ['region','relation']){
  const tracker=new CoordinateHands(),gate=new DwellGate(),r={...DEFAULT_REGION,seconds:.35,point:8};
  const events:number[]=[];
  const step=(t:number,side?:string)=>{
   const points=tracker.step({landmarks:side?[cloud(.4,true)]:[],handedness:side?[[{categoryName:side,score:.99}]]:[]},'any',false,t);
   const active=mode==='region'?regionPoint('hand',points,r):relationValue('hand',relationFrame('hand',points),{...DEFAULT_RELATION,threshold:.5});
   const point=mode==='region'?active as [number,number]|null:active===null?null:[active?.5:0,.5] as [number,number];
   if(gate.step(point,t,r).fire)events.push(t);
  };
  step(0,'Left');step(200,'Left');step(250);step(300,'Right');step(500,'Right');
  assert.deepEqual(events,[]);
  for(let t=600;t<=1200;t+=100)step(t,'Right');assert.equal(events.length,1,mode);
  step(1300);step(2300);for(let t=2400;t<=3200;t+=100)step(t,'Right');assert.equal(events.length,1,mode);
 }
});
test('continuous controller observes both legitimate endpoints and emits nothing while input is missing',()=>{
 const model=new ContinuousController([{vector:[0,0],value:0},{vector:[1,1],value:1}]);
 assert.equal(model.step({...frame(0,0),shape:[0,0]},0).value,0);
 assert.deepEqual(model.step(null,100),{value:null,emit:false});
 assert.equal(model.step({...frame(500,1,'right'),shape:[1,1]},500).value,1);
});
test('ground truth identity demonstrates why a confident label alone cannot prove recording identity',()=>{
 const tracker=new CoordinateHands();
 const a=cloud(.4),b=cloud(.4); // Distinct people/hands can produce the same measured landmarks.
 tracker.step({landmarks:[a],handedness:[[{categoryName:'Left',score:.99}]]},'any',false,0);
 const selected=tracker.step({landmarks:[b],handedness:[[{categoryName:'Left',score:.99}]]},'any',false,100);
 assert.equal(coordinateHandSide(selected),'left');
 assert.deepEqual(selected.map(({x,y,z})=>({x,y,z})),b);
 // Ground truth changed from A to B. No observable landmark/label difference exists.
});
test('crossing, confident swapped labels and duplicate labels expose ambiguity before recording can mix identities',()=>{
 for(const scenario of ['overlap','swapped','duplicate']){
  const tracker=new CoordinateHands();
  tracker.step({landmarks:[cloud(.2),cloud(.7)],handedness:[[{categoryName:'Left',score:.99}],[{categoryName:'Right',score:.99}]]},'any',false,0);
  const xs=scenario==='overlap'?[.5,.51]:[.7,.2];
  tracker.step({landmarks:xs.map(x=>cloud(x)),handedness:[[{categoryName:'Left',score:.99}],[{categoryName:scenario==='duplicate'?'Left':'Right',score:.99}]]},'any',false,100);
  assert.equal(tracker.ambiguous,true,scenario);
 }
});
test('handover timing stays at 300 ms and normal entry never preempts ground-truth A',()=>{
 const tracker=new CoordinateHands();
 const input=(sides:string[])=>({landmarks:sides.map(side=>cloud(side==='Left'?.2:.7)),handedness:sides.map(categoryName=>[{categoryName,score:.99}])});
 assert.equal(coordinateHandSide(tracker.step(input(['Right']),'any',false,0)),'right');
 assert.equal(coordinateHandSide(tracker.step(input(['Left','Right']),'any',false,100)),'right');
 assert.equal(tracker.step(input(['Left']),'any',false,200).length,0);
 assert.equal(tracker.step(input(['Left']),'any',false,499).length,0);
 assert.equal(coordinateHandSide(tracker.step(input(['Left']),'any',false,500)),'left');
 assert.equal(coordinateHandSide(tracker.step(input(['Right','Left']),'any',false,600)),'left');
});
