import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {createCoordinates,cleanCoordinateConfig,lockCoordinateScope,switchCoordinateHands,selectCoordinatePoints,CoordinateSampler,coordinateText,coordinateOsc,type CoordinateConfig} from './coordinates';
import {CoordinateStudio} from './CoordinateStudio';
import {CoordinateOutputDialog} from './CoordinateOutputDialog';
import {validateProject,type Project,type Point} from './core';
import {encodeMessage} from './serial';
import {validateMqttMessage} from './mqtt-output';
const both:Point[]=Array.from({length:42},(_,id)=>({x:id<21?.2:.8,y:.4,z:.1}));
const only=(side:'left'|'right')=>both.map((point,id)=>(id<21)===(side==='left')?point:{x:NaN,y:NaN,z:NaN});
const project=(coordinates:CoordinateConfig):Project=>({schemaVersion:1,name:'Scope test',mode:'hand',feature:'shape',learning:'coordinates',coordinates,actions:[{id:'output',name:'Coordinates',effect:'indicator',color:'#bcd7ff',samples:[],trained:false,threshold:.7}],updatedAt:new Date().toISOString()});

test('creation fixes the project capacity; conflicting hand modes cannot be applied',()=>{
 for(const scope of ['single','dual'] as const){
   const config=createCoordinates('hand',scope);
   assert.equal(config.handScope,scope);assert.equal(config.handMode,scope);
   assert.throws(()=>switchCoordinateHands(config,scope==='single'?'dual':'single'));
   assert.throws(()=>cleanCoordinateConfig('hand',{...config,handMode:scope==='single'?'dual':'single'}));
 }
 assert.throws(()=>cleanCoordinateConfig('hand',{...createCoordinates('hand'),outputHands:'both'}));
 assert.equal(createCoordinates('face').handScope,undefined);
});

test('legacy inference preserves names, axes, archived selection and wire format',()=>{
 const old={points:[0,8],names:{8:'pitch'},axes:'xyz' as const,enabledAxes:['x','z'] as ('x'|'z')[],named:false,hz:10,smoothing:0,handProfiles:{dual:{points:[8,29],named:true}}};
 const before=JSON.stringify(old),locked=lockCoordinateScope('hand',old);
 assert.equal(locked.handScope,'single');assert.equal(JSON.stringify(old),before);
 assert.deepEqual(locked.names,old.names);assert.deepEqual(locked.handProfiles,old.handProfiles);
 const frame=new CoordinateSampler('hand',locked).step(both,100).frame!;
 assert.equal(coordinateText(frame,locked),coordinateText(frame,old));
 assert.equal(lockCoordinateScope('hand',{...createCoordinates('hand','dual'),handScope:undefined}).handScope,'dual');
});

test('dual output can select either fixed side without changing selected points or channel names',()=>{
 const all=selectCoordinatePoints('hand',createCoordinates('hand','dual'),Array.from({length:42},(_,id)=>id));
 for(const outputHands of ['both','left','right'] as const){
   const config=cleanCoordinateConfig('hand',{...all,axes:'xyz',outputHands,smoothing:0});
   const frame=new CoordinateSampler('hand',config).step(both,100).frame!;
   assert.equal(frame.points.length,outputHands==='both'?42:21);
   const text=coordinateText(frame,config),values=JSON.parse(text).values;
   assert.equal(Object.keys(values).length,outputHands==='both'?126:63);
   if(outputHands==='left')assert.ok(Object.keys(values).every(name=>name.startsWith('left_')));
   if(outputHands==='right')assert.ok(Object.keys(values).every(name=>name.startsWith('right_')));
   assert.equal(new TextDecoder().decode(encodeMessage({text,lineEnding:'lf'},true)),text+'\n');
   assert.doesNotThrow(()=>validateMqttMessage({topic:'platform/coordinates',payload:text,qos:0},true));
   assert.equal(coordinateOsc(frame,config).length,frame.points.length);
   assert.equal(config.points.length,42);
 }
});

test('either-hand dual output stays with its current hand through entry, occlusion and recovery',()=>{
 const config={...createCoordinates('hand','dual'),outputHands:'any' as const,smoothing:.7};
 const sampler=new CoordinateSampler('hand',config);
 assert.deepEqual(sampler.step(only('right'),0).frame?.points.map(p=>p.id),[29]);
 assert.deepEqual(sampler.step(both,100).frame?.points.map(p=>p.id),[29]);
 assert.equal(sampler.step([],200).frame,null);
 assert.deepEqual(sampler.step(both,700).frame?.points.map(p=>p.id),[29]);
 assert.equal(sampler.step(only('left'),800).frame,null);
 assert.deepEqual(sampler.step(only('left'),1100).frame?.points.map(p=>p.id),[8]);
 assert.deepEqual(sampler.step(both,1200).frame?.points.map(p=>p.id),[8]);
 assert.equal(sampler.step(only('right'),1300).frame,null);
 assert.equal(sampler.step(only('right'),1600).frame?.points[0].x,.2);
});

test('scope, hand output choice, both point sets and names persist across reopening',()=>{
 const config={...createCoordinates('hand','dual'),points:[0,8,21,29],names:{8:'left_pitch',29:'right_volume'},enabledAxes:['x','z'] as ('x'|'z')[],outputHands:'right' as const};
 const reopened=validateProject(JSON.parse(JSON.stringify(project(config)))).coordinates!;
 assert.deepEqual(reopened,config);
 const left={...reopened,outputHands:'left' as const};
 assert.deepEqual(left.points,config.points);assert.deepEqual(left.names,config.names);
 assert.ok(Object.keys(JSON.parse(coordinateText(new CoordinateSampler('hand',left).step(both,100).frame!,left)).values).every(name=>name.startsWith('left_')));
});

test('workspaces expose hand participation but no project mode switch; output previews match fixed-side filtering',()=>{
 for(const scope of ['single','dual'] as const){
   const html=renderToStaticMarkup(<CoordinateStudio initial={project(createCoordinates('hand',scope))} onBack={()=>{}}/>);
   assert.doesNotMatch(html,/aria-label="追踪手数"/);
   assert.equal(html.includes('aria-label="参与输出"'),scope==='dual');
   assert.equal(html.includes('使用哪只手'),false);
   assert.equal(html.includes('任意一只'),false);assert.equal(html.includes('仅左手'),false);assert.equal(html.includes('仅右手'),false);
 }
 const config={...createCoordinates('hand','dual'),outputHands:'right' as const};
 const html=renderToStaticMarkup(<CoordinateOutputDialog mode="hand" protocol="OSC" config={config} prefix="/platform/hand" onApply={()=>{}} onClose={()=>{}} connection={()=>null}/>);
 assert.ok(html.includes('right_index_tip'));assert.ok(!html.includes('left_index_tip'));
});

test('automatic-hand UI migrates old side restrictions without changing points, names or axes',()=>{
 const old={...createCoordinates('hand'),hand:'left' as const,names:{8:'pitch'},enabledAxes:['x','z'] as ('x'|'z')[]};
 const automatic=lockCoordinateScope('hand',old);
 assert.equal(automatic.hand,undefined);assert.deepEqual(automatic.points,old.points);assert.deepEqual(automatic.names,old.names);assert.deepEqual(automatic.enabledAxes,old.enabledAxes);
 for(const outputHands of ['left','right'] as const){
   const dual={...createCoordinates('hand','dual'),outputHands,names:{8:'pitch',29:'volume'}};
   const migrated=lockCoordinateScope('hand',dual);assert.equal(migrated.outputHands,'any');assert.deepEqual(migrated.points,dual.points);assert.deepEqual(migrated.names,dual.names);
 }
});
