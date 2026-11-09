import test from 'node:test';import assert from 'node:assert/strict';
import {captureDetectionImage,regionFromDrag,sourceCrop,validDetectionRegion} from './detection-region';
import {cleanObjectProject,newObjectProject,PresenceGate} from './objects';
test('drag region handles reverse direction, clamps borders and rejects a click-sized selection',()=>{
 assert.deepEqual(regionFromDrag([.75,.8],[.25,.2]),{x:.25,y:.2,width:.5,height:.6000000000000001});
 assert.deepEqual(regionFromDrag([-.2,0],[1.3,1]),{x:0,y:0,width:1,height:1});assert.equal(regionFromDrag([.5,.5],[.501,.501]),null);
 assert.equal(validDetectionRegion({x:.9,y:0,width:.2,height:1}),false);
});
test('crop pixel bounds use source coordinates and actual send image is the cropped canvas',()=>{
 assert.deepEqual(sourceCrop(1920,1080,{x:.25,y:.2,width:.5,height:.5}),{x:480,y:216,width:960,height:540});
 const previous=globalThis.document;const draws:unknown[][]=[];const canvas={width:0,height:0,getContext:()=>({drawImage:(...args:unknown[])=>draws.push(args)}),toDataURL:()=>`crop:${canvas.width}x${canvas.height}`};
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>canvas}});
 try{const source={} as CanvasImageSource;assert.equal(captureDetectionImage(source,1920,1080,{x:.25,y:.2,width:.5,height:.5}),'crop:640x360');assert.deepEqual(draws[0],[source,480,216,960,540,0,0,640,360]);}finally{if(previous)Object.defineProperty(globalThis,'document',{configurable:true,value:previous});else delete (globalThis as any).document;}
});
test('object exports persist only region geometry and confirmation readout never creates output events',()=>{
 const project={...newObjectProject('ROI'),region:{x:.1,y:.2,width:.5,height:.4,secret:'drop'}};const clean=cleanObjectProject(project);assert.deepEqual(clean.region,{x:.1,y:.2,width:.5,height:.4});
 assert.throws(()=>cleanObjectProject({...project,region:{x:0,y:0,width:0,height:1}}));
 const gate=new PresenceGate();assert.equal(gate.step(true,3),null);assert.deepEqual(gate.progress(3),{value:true,count:1,needed:3,confirmed:false});assert.equal(gate.step(true,3),null);assert.equal(gate.step(true,3),true);assert.equal(gate.step(true,3),null);assert.equal(gate.progress(3).count,3);assert.equal(gate.step(false,3),null);assert.equal(gate.progress(3).count,1);gate.reset();assert.equal(gate.progress(3).count,0);
});
