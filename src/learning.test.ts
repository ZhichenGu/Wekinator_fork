import {test} from 'node:test';
import assert from 'node:assert/strict';
import {appendSample,buildTemplates,type Action,type Frame,type Project,type Sample} from './core';
import {buildPosePrototypes,PoseGate,poseQuality,poseScores,Recognizer,winningAction} from './learning';
export function held(value:number,noise=.005):Frame[]{return Array.from({length:31},(_,i)=>({t:i*50,points:[],shape:[value+Math.sin(i)*noise,value+Math.cos(i)*noise],root:[.3+i*.001,.4],scale:.1}));}
export function take(id:string,value:number,noise=.005,split:'train'|'test'='train',negative=false):Sample{return {id,frames:held(value,noise),duration:1500,negative,split};}
export const A:Action={id:'a',name:'姿态 A',effect:'indicator',color:'#dddddd',threshold:.8,trained:true,samples:[take('train-a',0)]};
export const B:Action={...A,id:'b',name:'姿态 B',samples:[take('train-b',1)]};
export const poseProject:Project={schemaVersion:1,name:'姿态合成测试',mode:'hand',feature:'shape',learning:'pose',poseHoldSeconds:.35,actions:[A,B],updatedAt:''};
test('stationary poses train successfully without the dynamic motion-energy requirement',()=>{
  assert.equal(poseQuality(A.samples[0]).valid,true);
  assert.equal(buildPosePrototypes([A]).length,1);
  assert.equal(buildTemplates([A],'shape').length,0);
});
test('pose prototypes ignore held-out clips and reject unstable training clips',()=>{
  const moving=take('moving',0);moving.frames=moving.frames.map((f,i)=>({...f,shape:[i/30,i/30]}));
  assert.equal(poseQuality(moving).valid,false);
  const prototypes=buildPosePrototypes([{...A,samples:[...A.samples,take('test',1,.005,'test'),moving]}]);
  assert.equal(prototypes.length,1);
  assert.equal(winningAction(poseScores(held(1),prototypes),[A]),null);
});
test('unknown and ambiguous postures remain unclassified; negative prototypes veto a match',()=>{
  const prototypes=buildPosePrototypes([A,B]);
  assert.equal(winningAction(poseScores(held(3),prototypes),[A,B]),null);
  assert.equal(winningAction({a:.96,b:.94},[A,B]),null);
  const constrained=buildPosePrototypes([{...A,samples:[...A.samples,take('not-a',.05,.005,'train',true)]}]);
  assert.equal(winningAction(poseScores(held(.05),constrained),[A]),null);
});
test('pose gate confirms a stable hold once, permits a different stable category, and resets on sustained unknown',()=>{
  const gate=new PoseGate(350),events:string[]=[];
  for(let t=0;t<=1000;t+=100){const id=gate.update({a:.99},[A,B],t);if(id)events.push(id);}
  for(let t=1100;t<=2000;t+=100){const id=gate.update({b:.99},[A,B],t);if(id)events.push(id);}
  assert.deepEqual(events,['a','b']);
  for(let t=2100;t<=2500;t+=100)gate.update({},[A,B],t);
  for(let t=2600;t<=3100;t+=100){const id=gate.update({b:.99},[A,B],t);if(id)events.push(id);}
  assert.deepEqual(events,['a','b','b']);
});
test('a tracking gap cannot stand in for an observed stable hold',()=>{
  const gate=new PoseGate(350);assert.equal(gate.update({a:1},[A],0),null);assert.equal(gate.update({a:1},[A],1000),null);assert.equal(gate.update({a:1},[A],1100),null);
});
test('shared recognizer emits only one event for a held pose and tolerates feature dimension mismatch',()=>{
  const recognizer=new Recognizer(poseProject);let hits=0;
  for(const frame of held(.02)){if(recognizer.step(frame,frame.t).eventId)hits++;}
  assert.equal(hits,1);assert.equal(recognizer.step(null,1600).state,'lost');
  const bad={...held(0)[0],t:1700,shape:[1,2,3]};assert.equal(recognizer.step(bad,1700).eventId,null);
});
test('appending a held-out clip preserves the trained model while appending training data invalidates it',()=>{
  assert.equal(appendSample(A,take('held-out',.02,.01,'test')).trained,true);
  assert.equal(appendSample(A,take('more-train',.02)).trained,false);
});
