import test from 'node:test';import assert from 'node:assert/strict';import {DwellGate,DEFAULT_REGION,validRegion} from './region';import {validateProject} from './core';
const inside:[number,number]=[.5,.5],outside:[number,number]=[.1,.1];
function dwell(g:DwellGate,start:number){for(let t=start;t<start+1000;t+=100)assert.equal(g.step(inside,t,DEFAULT_REGION).fire,false);return g.step(inside,start+1000,DEFAULT_REGION);}
test('dwell fires once and needs a confirmed exit to rearm',()=>{const g=new DwellGate();assert.equal(dwell(g,0).fire,true);assert.equal(g.step(inside,1100,DEFAULT_REGION).fire,false);g.step(outside,1200,DEFAULT_REGION);g.step(outside,1400,DEFAULT_REGION);assert.equal(dwell(g,1500).fire,true);});
test('loss interrupts timing without rearming a fired event',()=>{const g=new DwellGate();g.step(inside,0,DEFAULT_REGION);g.step(null,100,DEFAULT_REGION);assert.equal(dwell(g,200).fire,true);g.step(null,1300,DEFAULT_REGION);assert.equal(dwell(g,1400).fire,false);});
test('long frame gaps cannot complete dwell',()=>{const g=new DwellGate();g.step(inside,0,DEFAULT_REGION);assert.equal(g.step(inside,2000,DEFAULT_REGION).progress,0);});
test('region project validates round-trip settings and rejects out-of-frame region',()=>{const p={schemaVersion:1,name:'Region',mode:'hand',feature:'shape',learning:'region',region:{...DEFAULT_REGION,seconds:1.25},actions:[]};assert.equal(validateProject(JSON.parse(JSON.stringify(p))).region?.seconds,1.25);assert.throws(()=>validateProject({...p,region:{...DEFAULT_REGION,x:.9}}));assert.equal(validRegion({...DEFAULT_REGION,seconds:NaN}),false);});

test('selected landmark, not the wrist or training eligibility, drives region dwell in mirrored coordinates',async()=>{
 const {regionPoint}=await import('./region');const points=Array.from({length:21},()=>({x:.4,y:.35}));points[0]={x:.8,y:.7};
 const r={x:.5,y:.25,width:.3,height:.2,seconds:.5,point:8};
 assert.deepEqual(regionPoint('hand',points,r),[.6,.35]);assert.deepEqual(regionPoint('hand',points,DEFAULT_REGION),[.19999999999999996,.7]);
 const gate=new DwellGate();for(let t=0;t<500;t+=100)assert.equal(gate.step(regionPoint('hand',points,r),t,r).fire,false);
 assert.equal(gate.step(regionPoint('hand',points,r),500,r).fire,true);
 const body=Array.from({length:33},()=>({x:.4,y:.35,visibility:0}));body[15].visibility=1;
 assert.deepEqual(regionPoint('pose',body,{...r,point:15}),[.6,.35]);body[15].visibility=.1;assert.equal(regionPoint('pose',body,{...r,point:15}),null);
});
test('selected region and relationship points persist and reject invalid indices',async()=>{
 const {DEFAULT_RELATION}=await import('./relation');const p={schemaVersion:1,name:'Points',mode:'hand',feature:'shape',learning:'region',region:{...DEFAULT_REGION,point:8},relation:{...DEFAULT_RELATION,points:[4,8]},actions:[]};
 const copy=validateProject(JSON.parse(JSON.stringify(p)));assert.equal(copy.region?.point,8);assert.deepEqual(copy.relation?.points,[4,8]);
 assert.throws(()=>validateProject({...p,region:{...p.region,point:21}}));assert.throws(()=>validateProject({...p,relation:{...p.relation,points:[8,8]}}));assert.throws(()=>validateProject({...p,relation:{...p.relation,points:[4,200]}}));
});
test('a gap outside the region cannot rearm an already fired event',()=>{
 const g=new DwellGate();assert.equal(dwell(g,0).fire,true);g.step(outside,1100,DEFAULT_REGION);g.step(outside,2100,DEFAULT_REGION);assert.equal(dwell(g,2200).fire,false);
});
