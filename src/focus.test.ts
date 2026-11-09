import test from 'node:test';import assert from 'node:assert/strict';
import {focusedFrame,changeFocus,recommendedPoints,focusPresets} from './focus';
import {extract,validateProject,type Point,type Project,type Frame,type Action} from './core';
import {sequence,buildTemplates,match} from './core';
import {buildPosePrototypes,poseScores} from './learning';
import {buildAnchors,ContinuousController} from './continuous';
const points=():Point[]=>Array.from({length:21},(_,i)=>({x:.3+i*.01,y:i===0?.7:i===9?.5:.4,visibility:0}));
function frames(value:number){return Array.from({length:14},(_,i)=>{const p=points();p[8].y=value;return focusedFrame('hand',p,[4,8],i*80)!;});}
function action(id:string,value:number,target:number):Action{return {id,name:id,effect:'indicator',color:'#ffffff',trained:true,threshold:.8,controlValue:target,samples:[{id,negative:false,duration:1040,frames:frames(value)}]};}
test('focus ignores unselected motion, retains selected variation and normalizes translation and scale',()=>{
 const p=points(),a=focusedFrame('hand',p,[4,8],0)!;p[20].x=.99;
 const b=focusedFrame('hand',p,[4,8],1)!;assert.deepEqual(a.shape,b.shape);assert.deepEqual(a.root,b.root);
 p[8].x+=.1;assert.notDeepEqual(a.shape,focusedFrame('hand',p,[4,8],2)!.shape);
 const moved=points().map(p=>({...p,x:p.x*1.2+.05,y:p.y*1.2-.1}));const c=focusedFrame('hand',moved,[4,8],0)!;
 a.shape.forEach((v,i)=>assert.ok(Math.abs(v-c.shape[i])<1e-10));
});
test('focused body permits partial legs but rejects missing selected or reference points',()=>{
 const p=Array.from({length:33},(_,i)=>({x:.3+i*.01,y:i<23?.3:.7,visibility:i<25?1:0}));
 assert.equal(extract('pose',p),null);assert.ok(focusedFrame('pose',p,[11,12,13,14,15,16],0));
 p[15].visibility=0;assert.equal(focusedFrame('pose',p,[11,12,13,14,15,16],0),null);
 p[15].visibility=1;p[23].visibility=0;assert.equal(focusedFrame('pose',p,[15],0),null);
});
test('changed focus persists, invalidates training, preserves data and can restore face expressions',()=>{
 const facial=Array.from({length:478},(_,i)=>({x:.2+(i%30)*.01,y:.2+(i%20)*.01}));const base=extract('face',facial,[.2,.8],0)!;
 const p:Project={schemaVersion:1,name:'Focus',mode:'face',feature:'shape',updatedAt:'',actions:[{...action('a',.3,0),samples:[{id:'f',negative:false,duration:1040,frames:Array.from({length:14},(_,i)=>({...base,t:i*80}))}]}]};
 const changed=changeFocus(p,[13,14]);assert.equal(changed.actions[0].trained,false);assert.equal(p.actions[0].trained,true);assert.deepEqual(changed.actions[0].samples[0].frames[0].points,facial);
 assert.deepEqual(validateProject(JSON.parse(JSON.stringify(changed))).focus,[13,14]);
 assert.deepEqual(changeFocus(changed,undefined).actions[0].samples[0].frames[0].shape,base.shape);
 assert.throws(()=>changeFocus(p,[]));assert.throws(()=>validateProject({...p,focus:[1,1]}));assert.throws(()=>validateProject({...p,focus:[478]}));
});
test('focused features feed dynamic templates, pose classification and continuous regression',()=>{
 const a=action('a',.2,0),b=action('b',.6,1),actions=[a,b];
 const proto=buildPosePrototypes(actions);assert.ok((poseScores(frames(.2),proto).a??0)>.95);
 const anchors=buildAnchors(actions);const controller=new ContinuousController(anchors);let result;for(const f of frames(.4))result=controller.step(f,f.t);assert.ok(result!.value!==null);assert.ok(result!.value!>0&&result!.value!<1);
 const motion=frames(.2).map((f,i)=>({...f,root:[f.root[0]+i*.01,f.root[1]] as [number,number]}));const dynamic={...a,samples:[{...a.samples[0],frames:motion}]};
 const templates=buildTemplates([dynamic],'path');assert.ok(templates.length);assert.ok((match(motion,templates,'path').a??0)>.9);
});
test('all presets use valid sorted points and legacy recommended points stay available',()=>{for(const mode of ['hand','face','pose'] as const){assert.ok(recommendedPoints(mode).length);for(const p of focusPresets(mode)){assert.deepEqual(p.ids,[...new Set(p.ids)].sort((a,b)=>a-b));}}});
