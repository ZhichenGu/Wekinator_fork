import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CoordinateSampler,cleanCoordinateConfig,defaultCoordinates,coordinateText,coordinateOsc} from './coordinates';
import {encodeMessage} from './serial';
import {validateProject} from './core';
import {validateMqttMessage} from './mqtt-output';
test('mirrored coordinates rate-limit and recover without stale smoothing',()=>{
 const s=new CoordinateSampler('hand',{...defaultCoordinates('hand'),smoothing:.7});
 const p=Array.from({length:21},()=>({x:.2,y:.3,z:-.1}));
 assert.equal(s.step(p,0).frame?.points[0].x,.8);
 assert.equal(s.step(p,50).due,false);assert.equal(s.step(p,100).due,true);
 assert.equal(s.step([],110).frame,null);
 const recovered=s.step(p.map(p=>({...p,x:.9})),120);
 assert.equal(recovered.frame?.points[0].x,.1);assert.equal(recovered.due,true);
});
test('selected pose joints work independently of learning features; unavailable depth pauses',()=>{
 const s=new CoordinateSampler('pose',{points:[15],axes:'xyz',hz:10,smoothing:0});
 const p=Array.from({length:33},()=>({x:.2,y:.4,z:-.2,visibility:0}));
 p[15].visibility=.9;assert.equal(s.step(p,1).frame?.points[0].z,-.2);
 p[15].visibility=.2;assert.equal(s.step(p,200).frame,null);
 assert.equal(s.step(p.map(p=>({x:p.x,y:p.y,visibility:1})),300).frame,null);
});
test('four-point XYZ messages fit current Serial and MQTT limits',()=>{
 const s=new CoordinateSampler('face',{points:[1,33,263,477],axes:'xyz',hz:30,smoothing:0});
 const p=Array.from({length:478},()=>({x:.1234567,y:.654321,z:-99.123456}));
 const f=s.step(p,1234567890123).frame!,text=coordinateText(f);
 assert.ok(text.length<=512);assert.equal(new TextDecoder().decode(encodeMessage({text,lineEnding:'lf'})),text+'\n');validateMqttMessage({topic:'platform/coordinates',payload:text,qos:0});
 assert.equal(coordinateOsc(f)[0].values.length,3);
});
test('coordinate config rejects duplicate, out-of-range and oversized selection',()=>{
 assert.throws(()=>cleanCoordinateConfig('hand',{...defaultCoordinates('hand'),points:[8,8]}));
 assert.throws(()=>cleanCoordinateConfig('hand',{...defaultCoordinates('hand'),points:[21]}));
 assert.throws(()=>cleanCoordinateConfig('face',{...defaultCoordinates('face'),points:[1,2,3,4,5]}));
 assert.throws(()=>cleanCoordinateConfig('hand',{...defaultCoordinates('hand'),hz:Infinity}));
});

test('coordinate projects round-trip all three modes with validated point selection',()=>{
 for(const mode of ['hand','face','pose'] as const){
  const project={schemaVersion:1,name:'Coordinates',mode,feature:'shape',learning:'coordinates',coordinates:defaultCoordinates(mode),actions:[{id:'output',name:'Coordinates',effect:'indicator',color:'#bcd7ff',samples:[],trained:false,threshold:.7}],updatedAt:new Date().toISOString()};
  const clean=validateProject(JSON.parse(JSON.stringify(project)));
  assert.deepEqual(clean.coordinates,defaultCoordinates(mode));
  assert.equal(clean.learning,'coordinates');
 }
});
