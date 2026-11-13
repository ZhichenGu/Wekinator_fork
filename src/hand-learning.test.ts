import test from 'node:test';
import assert from 'node:assert/strict';
import {extract,sequence,energy,validateProject,type Action,type Frame,type Point,type Project,type Sample} from './core';
import {HandLearningInput,dualHandFrame,storedHandInputs} from './hand-learning';
import {Recognizer} from './learning';
import {trackedFeatures,buildLabTemplates} from './lab-motion';
import {buildAnchors,ContinuousController} from './continuous';
import {changeFocus} from './focus';
import {recordingQuality} from './recording';
const hand=(x:number,pose=0):Point[]=>Array.from({length:21},(_,id)=>({x:x+(id%4)*.015+(id===8?pose:0),y:.65-Math.floor(id/4)*.02-(id===9?.1:0),z:0}));
const absent=()=>Array.from({length:21},()=>({x:NaN,y:NaN}));
const both=(x=.2,y=.7,pose=0)=>[...hand(x,pose),...hand(y,pose)];
const sample=(frames:Frame[],id='sample'):Sample=>({id,frames,duration:frames.at(-1)!.t-frames[0].t,negative:false});
const action=(id:string,count:1|2,frames:Frame[],handSide:'any'|'left'|'right'='any'):Action=>({id,name:id,handCount:count,hand:handSide,effect:'indicator',color:'#dddddd',trained:true,threshold:.7,samples:[sample(frames,id)]});
const project=(actions:Action[],learning:Project['learning']='pose'):Project=>({schemaVersion:1,name:'Hand tests',mode:'hand',feature:'both',handTracking:'mixed',learning,actions,updatedAt:new Date().toISOString(),labBaseline:true});
const frames=(count:1|2,pose=0)=>Array.from({length:20},(_,i)=>count===2?dualHandFrame(both(.2,.7,pose),i*80)!:{...extract('hand',hand(.2,pose),[],i*80)!,handCount:1 as const,handSide:'left' as const});

test('hand input locks any-hand identity, pauses the joint frame and independently restores both',()=>{
 const input=new HandLearningInput();
 assert.equal(input.step([...absent(),...hand(.7)],0).any?.handSide,'right');
 assert.equal(input.step(both(),80).any?.handSide,'right');
 const missing=input.step([...hand(.2),...absent()],160);
 assert.equal(missing.dual,null);assert.equal(missing.right,null);assert.equal(missing.left?.points.length,21);
 assert.equal(input.step(both(),240).dual?.points.length,42);
});

test('joint geometry and path retain opposite movement even when the midpoint does not move',()=>{
 const frames=Array.from({length:21},(_,i)=>dualHandFrame(both(.2+i*.005,.7-i*.005),i*80)!);
 assert.ok(frames.every(f=>Math.abs(f.root[0]-frames[0].root[0])<1e-8));
 assert.ok(energy(sequence(frames,'path'))>.1);
 const changed=dualHandFrame([...hand(.2),...hand(.7,.08)],0)!;
 assert.notDeepEqual(trackedFeatures(frames[0],{mode:'hand'})?.shape,trackedFeatures(changed,{mode:'hand'})?.shape);
 assert.equal(dualHandFrame([...hand(.2),...absent()],0),null);
 assert.equal(recordingQuality(frames,1600).valid,true);
});

test('mixed project pose recognition prefers a complete joint pose and never matches it from one hand',()=>{
 const single=action('single',1,frames(1)),dual=action('dual',2,frames(2));
 const model=new Recognizer(project([single,dual])),input=new HandLearningInput();
 let event:string|null=null;
 for(let t=0;t<=800;t+=80)event=model.stepHands(input.step(both(),t),t).eventId??event;
 assert.equal(event,'dual');
 const lone=new Recognizer(project([single,dual]));event=null;
 for(let t=0;t<=800;t+=80)event=lone.stepHands(input.step([...hand(.2),...absent()],t),t).eventId??event;
 assert.equal(event,'single');
 const onlyDual=new Recognizer(project([dual]));
 for(let t=0;t<=800;t+=80)assert.equal(onlyDual.stepHands(input.step([...hand(.2),...absent()],t),t).eventId,null);
});

test('fixed-hand actions cannot be driven by the other hand; offline playback uses the same scope',()=>{
 const model=new Recognizer(project([action('left',1,frames(1),'left')])),input=new HandLearningInput();
 for(let t=0;t<=800;t+=80)assert.equal(model.stepHands(input.step([...absent(),...hand(.7)],t),t).eventId,null);
 let event:string|null=null;
 for(const frame of frames(1))event=model.step(frame,frame.t).eventId??event;
 assert.equal(event,'left');
 const jointModel=new Recognizer(project([action('dual',2,frames(2))]));
 for(const frame of frames(1))assert.equal(jointModel.step(frame,frame.t).eventId,null);
});

test('dual dynamic motion trains and fires with both wrist trajectories; single input cannot trigger it',()=>{
 const clip=Array.from({length:21},(_,i)=>dualHandFrame(both(.2+Math.sin(i/20*Math.PI)*.1,.7-Math.sin(i/20*Math.PI)*.1),i*80)!);
 const p={...project([action('joint',2,clip)],'dynamic'),feature:'path' as const};
 const model=new Recognizer(p);let event:string|null=null;
 for(const frame of clip)event=model.step(frame,frame.t).eventId??event;
 assert.equal(event,'joint');
 const enhanced={...p,lab:{features:true,trim:false,ensemble:true}};
 assert.ok(buildLabTemplates(enhanced).length);
 const enhancedModel=new Recognizer(enhanced);event=null;
 for(const frame of clip)event=enhancedModel.step(frame,frame.t).eventId??event;
 assert.equal(event,'joint');
 const lone=new Recognizer(p);
 for(const frame of clip){const one={...extract('hand',frame.points.slice(0,21),[],frame.t)!,handCount:1 as const};assert.equal(lone.step(one,frame.t).eventId,null);}
});

test('hand mode, per-action scopes and joint recordings survive project JSON reopen and focus changes',()=>{
 const p=project([action('one',1,frames(1),'left'),action('two',2,frames(2))]);
 const restored=validateProject(JSON.parse(JSON.stringify(p)));
 assert.equal(restored.handTracking,'mixed');assert.deepEqual(restored.actions.map(a=>a.handCount),[1,2]);
 const focused=changeFocus(restored,[0,8,9]);
 assert.deepEqual(focused.actions.map(a=>a.samples[0].frames[0].shape.length),[6,12]);
 assert.equal(focused.actions[1].samples[0].frames[0].handCount,2);
 assert.doesNotThrow(()=>validateProject(focused));
 const bad=structuredClone(p);bad.actions[1].samples[0].frames[0].handCount=1;
 assert.throws(()=>validateProject(bad));
 const swapped=structuredClone(p);swapped.actions[0].samples[0].frames[1].handSide='right';assert.throws(()=>validateProject(swapped));
});

test('joint continuous control learns two endpoints, pauses on hand loss and resumes from the new pose',()=>{
 const zero={...action('zero',2,frames(2)),controlValue:0};
 const one={...action('one',2,frames(2,.1)),controlValue:1};
 const p={...project([zero,one],'continuous'),handTracking:'dual' as const};
 const controller=new ContinuousController(buildAnchors(p.actions,p));
 assert.equal(controller.step(frames(2)[0],0).value,0);
 assert.equal(controller.stepHands(storedHandInputs(null),100).emit,false);
 assert.equal(controller.step(frames(2,.1)[0],200).value,1);
 assert.equal(controller.step(frames(1,.1)[0],300).value,null);
 assert.throws(()=>buildAnchors([zero],p));
});

test('legacy single hand projects keep the previous feature and recognizer path',()=>{
 const old={...project([action('old',1,frames(1))]),handTracking:undefined};
 const saved=validateProject(JSON.parse(JSON.stringify(old)));
 assert.equal(saved.handTracking,undefined);
 let event:string|null=null;const model=new Recognizer(saved);
 for(const frame of frames(1))event=model.step(frame,frame.t).eventId??event;
 assert.equal(event,'old');
});

test('mixed continuous endpoints are scoped; unmatched or missing groups emit no fabricated values',()=>{
 const actions=[{...action('s0',1,frames(1)),controlValue:0},{...action('s1',1,frames(1,.1)),controlValue:1},{...action('d0',2,frames(2)),controlValue:0},{...action('d1',2,frames(2,.1)),controlValue:1}];
 const p=project(actions,'continuous'),anchors=buildAnchors(actions,p);
 const controller=new ContinuousController(anchors);
 const single=storedHandInputs(frames(1)[0]);
 assert.equal(controller.stepHands(single,0).value,0);
 const dual=storedHandInputs(frames(2,.1)[0]);
 assert.equal(controller.stepHands(dual,100).value,1);
 assert.equal(controller.stepHands({...single,...{dual:frames(2)[0]}},200).value,null);
 assert.equal(controller.stepHands(storedHandInputs(null),300).emit,false);
});
