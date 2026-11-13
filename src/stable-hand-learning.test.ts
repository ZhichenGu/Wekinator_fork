import test from 'node:test';import assert from 'node:assert/strict';
import {CoordinateHands,coordinateHandSide} from './coordinate-hands';import{extract,validateProject,type Project}from'./core';import{focusedFrame}from'./focus';
const detected=(sides:string[])=>({landmarks:sides.map(side=>Array.from({length:21},(_,i)=>({x:(side==='Left'?.2:.7)+(i%4)*.01,y:.3+Math.floor(i/4)*.04,z:0}))),handedness:sides.map(categoryName=>[{categoryName,score:.99}])});
test('shared single-hand selector keeps its raw point cloud through second-hand entry and deliberate takeover',()=>{
  const tracker=new CoordinateHands();
  for(const[t,sides,expected]of [[0,['Right'],'right'],[100,['Left','Right'],'right'],[200,['Left'],undefined],[500,['Left'],'left'],[600,['Right','Left'],'left']]as const){
   const points=tracker.step(detected([...sides]),'any',false,t),side=coordinateHandSide(points);assert.equal(side,expected);
   assert.ok(points.length===0||points.length===21);
   const raw=extract('hand',points,[],t);const focus=focusedFrame('hand',points,[4,8],t);
   assert.equal(!!raw,!!expected);assert.equal(!!focus,!!expected);
  }
});
test('single-hand recording metadata persists in old-format projects and mixed-hand samples are rejected',()=>{
 const raw=extract('hand',detected(['Left']).landmarks[0],[],0)!;
 for(const learning of ['dynamic','pose','continuous']as const){
  const p:Project={schemaVersion:1,name:'Stable',mode:'hand',feature:'shape',learning,actions:[{id:'a',name:'A',effect:'indicator',color:'#ffffff',threshold:.7,trained:false,samples:[{id:'s',negative:false,duration:1040,frames:Array.from({length:14},(_,i)=>({...raw,t:i*80,handSide:'left' as const}))}]}],updatedAt:''};
  const copy=validateProject(JSON.parse(JSON.stringify(p)));assert.equal(copy.actions[0].samples[0].frames[0].handSide,'left');
  copy.actions[0].samples[0].frames[8].handSide='right';assert.throws(()=>validateProject(copy),/同一只手/);
  const old=JSON.parse(JSON.stringify(p));for(const f of old.actions[0].samples[0].frames)delete f.handSide;assert.doesNotThrow(()=>validateProject(old));
 }
});

import {Recognizer} from './learning';import {TriggerGate,type Frame} from './core';import{DwellGate,DEFAULT_REGION}from'./region';import{ContinuousController}from'./continuous';
const held=(t:number,side:'left'|'right'='left'):Frame=>({t,shape:[0,0],points:detected(['Left']).landmarks[0],root:[.2,.3],scale:.1,handSide:side});
const poseProject:Project={schemaVersion:1,name:'Pose',mode:'hand',learning:'pose',feature:'shape',actions:[{id:'a',name:'A',effect:'indicator',color:'#ffffff',trained:true,threshold:.7,samples:[{id:'s',negative:false,duration:1040,frames:Array.from({length:14},(_,i)=>held(i*80))}]}],updatedAt:''};
test('hand occlusion does not rearm an already recognized pose, but observed release does',()=>{
 for(const handTracking of [undefined,'single'] as const){
 const model=new Recognizer({...poseProject,handTracking});let hits=0;
 for(let t=0;t<=800;t+=100)if(model.step(held(t),t).eventId)hits++;
 assert.equal(hits,1);
 for(let t=900;t<=3000;t+=100)assert.equal(model.step(null,t).eventId,null);
 for(let t=3100;t<=4000;t+=100)if(model.step(held(t),t).eventId)hits++;
 assert.equal(hits,1);
 for(let t=4100;t<=4600;t+=100)model.step({...held(t),shape:[9,9]},t);
 for(let t=4700;t<=5400;t+=100)if(model.step(held(t),t).eventId)hits++;
 assert.equal(hits,2);
 }
});
test('pose handover must start its own confirmation instead of inheriting a partial hold',()=>{
 const model=new Recognizer(poseProject);
 for(const t of [0,100,200])assert.equal(model.step(held(t),t).eventId,null);
 for(const t of [300,400,500,600])assert.equal(model.step(held(t,'right'),t).eventId,null);
 assert.equal(model.step(held(700,'right'),700).eventId,'a');
});
test('dynamic lock survives missing-hand pauses without treating them as an observed release',()=>{
 const gate=new TriggerGate(),actions=poseProject.actions;
 assert.equal(gate.update({a:1},actions,0),'a');
 gate.update({},actions,100);gate.pause();assert.equal(gate.update({},actions,2000),null);assert.equal(gate.locked,true);
 assert.equal(gate.update({a:1},actions,2100),null);
 gate.update({},actions,2200);gate.update({},actions,2900);assert.equal(gate.locked,false);
});
test('dwell and relation gates restart partial timing after loss and do not duplicate a fired event on return',()=>{
 for(const seconds of [1,.35]){
  const g=new DwellGate(),r={...DEFAULT_REGION,seconds};
  g.step([.5,.5],0,r);g.step(null,100,r);
  assert.equal(g.step([.5,.5],200,r).fire,false);
  let hits=0;for(let t=300;t<2000;t+=100)if(g.step([.5,.5],t,r).fire)hits++;
  assert.equal(hits,1);g.step(null,2100,r);g.step(null,3500,r);
  for(let t=3600;t<5200;t+=100)assert.equal(g.step([.5,.5],t,r).fire,false);
 }
});
test('continuous output pauses on occlusion then resumes at the new value without a fabricated zero',()=>{
 const c=new ContinuousController([{vector:[0,0],value:0},{vector:[1,1],value:1}]);
 assert.equal(c.step(held(0),0).value,0);assert.deepEqual(c.step(null,100),{value:null,emit:false});
 assert.equal(c.step({...held(500,'right'),shape:[1,1]},500).value,1);
});
