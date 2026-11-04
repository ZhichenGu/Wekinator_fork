import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTemplates, dtw, match, sequence, TriggerGate, validateProject, type Action, type Frame, type Project } from './core';

const action:Action={id:'a',name:'动作 A',effect:'pulse',color:'#bdf1c9',samples:[],trained:true,threshold:.8};
function motion(duration=3000, offset=0, scale=1, reverse=false):Frame[]{
  return Array.from({length:61},(_,i)=>{const t=i/60,u=reverse?1-t:t;return {t:t*duration,points:[],shape:[Math.sin(u*Math.PI),u],root:[offset+scale*(u*.2),offset+scale*(Math.sin(u*Math.PI)*.1)],scale:.1*scale};});
}
const sample=(frames:Frame[],negative=false)=>({id:'s',frames,duration:frames.at(-1)!.t,negative});
test('relative features preserve translation and uniform scale invariance',()=>{
  const a=sequence(motion(),'both'),b=sequence(motion(3000,.3,.65),'both');
  assert.ok(dtw(a,b)<1e-10);
});
test('matches a full action at a different location and speed',()=>{
  const templates=buildTemplates([{...action,samples:[sample(motion())]}],'both');
  assert.ok(match(motion(3600,.3,.7),templates,'both').a>.95);
});
test('partial, static final posture, reversed and tracking gaps cannot trigger',()=>{
  const templates=buildTemplates([{...action,samples:[sample(motion())]}],'both');
  const reversed=motion(3000,0,1,true);
  const half=motion().slice(0,31);
  const final=motion().map(f=>({...f,shape:[0,1],root:[.2,0] as [number,number]}));
  const gap=motion().filter(f=>f.t<900||f.t>1800);
  for(const frames of [reversed,half,final,gap]) assert.ok((match(frames,templates,'both').a??0)<.8);
});
test('near-identical negative example vetoes a match',()=>{
  const templates=buildTemplates([{...action,samples:[sample(motion()),sample(motion(),true)]}],'both');
  assert.equal(match(motion(),templates,'both').a,0);
});
test('trigger locks until a sustained exit and cooldown, then allows another action',()=>{
  const gate=new TriggerGate();
  assert.equal(gate.update({a:.95},[action],0),'a');
  assert.equal(gate.update({a:.95},[action],5000),null);
  assert.equal(gate.update({a:0},[action],5100),null);
  assert.equal(gate.update({a:.9},[action],5400),null);
  assert.equal(gate.update({a:0},[action],5500),null);
  assert.equal(gate.update({a:0},[action],6200),null);
  assert.equal(gate.update({a:.95},[action],6300),'a');
});
test('ambiguous competing actions do not trigger',()=>{
  assert.equal(new TriggerGate().update({a:.95,b:.93},[action,{...action,id:'b'}],0),null);
});
test('project validation rejects corrupt temporal and numeric data',()=>{
  const project:Project={schemaVersion:1,name:'测试',mode:'hand',feature:'both',actions:[{...action,samples:[sample(motion())]}],updatedAt:''};
  assert.equal(validateProject(project).name,'测试');
  const broken=structuredClone(project);broken.actions[0].samples[0].frames[3].t=0;
  assert.throws(()=>validateProject(broken));
  const brokenNumber=structuredClone(project);brokenNumber.actions[0].samples[0].frames[3].shape[0]=Infinity;
  assert.throws(()=>validateProject(brokenNumber));
});

test('additional takes stay in the same action and invalidate templates without erasing earlier takes',async()=>{
  const {appendSample}=await import('./core');
  const original={...action,samples:[sample(motion())]};
  const next=appendSample(original,{...sample(motion(3600,.2,.8)),id:'new-take'});
  assert.equal(next.id,original.id);assert.equal(next.name,original.name);
  assert.equal(next.samples.length,2);assert.equal(original.samples.length,1);assert.equal(next.trained,false);
  assert.throws(()=>appendSample(next,next.samples[1]));
});
test('project serial settings and preview aspect survive validation, invalid settings are rejected',()=>{
  const project:Project={schemaVersion:1,name:'串口测试',mode:'hand',feature:'both',serialBaudRate:115200,actions:[{...action,effect:'serial',serial:{text:'0',lineEnding:'lf'},samples:[{...sample(motion()),aspectRatio:16/9}]}],updatedAt:''};
  assert.equal(validateProject(JSON.parse(JSON.stringify(project))).actions[0].serial?.text,'0');
  assert.throws(()=>validateProject({...project,serialBaudRate:42}));
  assert.throws(()=>validateProject({...project,actions:[{...project.actions[0],serial:{text:'1',lineEnding:'bad'}}]}));
});
