import test from 'node:test';
import assert from 'node:assert/strict';
import {CoordinateHands} from './coordinate-hands';
import {CoordinateSampler,coordinateText,coordinateOsc,cleanCoordinateConfig} from './coordinates';
import {validateProject} from './core';
const hand=(x:number)=>Array.from({length:21},()=>({x,y:.4,z:.1}));
const result=(entries:[string,number][])=>({landmarks:entries.map(([,x])=>hand(x)),handedness:entries.map(([categoryName])=>[{categoryName,score:.99}])});
test('either hand keeps its identity when detection order changes or another hand enters',()=>{
 const tracker=new CoordinateHands();
 assert.equal(tracker.step(result([['Right',.8]]))[8].x,.8);
 assert.equal(tracker.step(result([['Left',.2],['Right',.8]]))[8].x,.8);
 assert.equal(tracker.step(result([['Right',.8],['Left',.2]]))[8].x,.8);
});
test('dual hands pause independently, resume without stale smoothing and name both index tips',()=>{
 const tracker=new CoordinateHands();
 const config=cleanCoordinateConfig('hand',{handMode:'dual',points:[8,29],axes:'xy',hz:10,smoothing:.7,named:true});
 const sampler=new CoordinateSampler('hand',config);
 const both=sampler.step(tracker.step(result([['Left',.2],['Right',.8]]),'any',true),0).frame!;
 assert.deepEqual(Object.keys(JSON.parse(coordinateText(both,config)).values),['left_index_tip_x','left_index_tip_y','right_index_tip_x','right_index_tip_y']);
 const rightOnly=sampler.step(tracker.step(result([['Right',.8]]),'any',true),100).frame!;
 assert.deepEqual(rightOnly.points.map(p=>p.id),[29]);
 assert.equal(coordinateOsc(rightOnly,config)[0].name,'right_index_tip');
 const recovered=sampler.step(tracker.step(result([['Left',.5],['Right',.8]]),'any',true),200).frame!;
 assert.equal(recovered.points[0].x,.5);
 assert.equal(sampler.step([],300).frame,null);
});
test('uncertain handedness, duplicate labels and sudden crossing identity flips pause',()=>{
 const tracker=new CoordinateHands();
 tracker.step(result([['Left',.2],['Right',.8]]),'any',true);
 assert.ok(tracker.step(result([['Left',.8],['Right',.2]]),'any',true).every(p=>Number.isNaN(p.x)));
 assert.ok(tracker.step(result([['Left',.2],['Left',.8]]),'any',true).every(p=>Number.isNaN(p.x)));
 assert.equal(tracker.step({landmarks:[hand(.2)],handedness:[[{categoryName:'Left',score:.5}]]}).length,0);
});
test('saved two-hand project retains side selection, names, axes and legacy format remains available',()=>{
 const config={handMode:'dual' as const,hand:'right' as const,points:[8,29],names:{8:'left_pitch',29:'right_volume'},axes:'xyz' as const,enabledAxes:['x','z'] as ('x'|'z')[],hz:10,smoothing:0,named:true};
 const project={schemaVersion:1,name:'Hands',mode:'hand',feature:'shape',learning:'coordinates',coordinates:config,actions:[{id:'output',name:'Coordinates',effect:'indicator',color:'#bcd7ff',samples:[],trained:false,threshold:.7}],updatedAt:new Date().toISOString()};
 assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))).coordinates,config);
 assert.throws(()=>cleanCoordinateConfig('hand',{...config,points:Array.from({length:43},(_,id)=>id)}));
 assert.throws(()=>cleanCoordinateConfig('face',config));
});

test('crossing ambiguity recovers after four stable handedness frames',()=>{
 const tracker=new CoordinateHands();
 tracker.step(result([['Left',.2],['Right',.8]]),'any',true);
 for(let i=0;i<3;i++)assert.ok(tracker.step(result([['Left',.8],['Right',.2]]),'any',true).every(p=>Number.isNaN(p.x)));
 assert.equal(tracker.step(result([['Left',.8],['Right',.2]]),'any',true)[8].x,.8);
});

test('crossing recovery requires consecutive valid frames',()=>{
 const tracker=new CoordinateHands();
 tracker.step(result([['Left',.2],['Right',.8]]),'any',true);
 const crossed=result([['Left',.8],['Right',.2]]);
 tracker.step(crossed,'any',true);
 tracker.step(crossed,'any',true);
 tracker.step(crossed,'any',true);
 tracker.step(result([['Left',.5],['Right',.51]]),'any',true);
 assert.ok(tracker.step(crossed,'any',true).every(p=>Number.isNaN(p.x)));
});

test('one remaining hand with a flipped label cannot take over the missing side',()=>{
 const tracker=new CoordinateHands();
 tracker.step(result([['Left',.2],['Right',.8]]),'any',true);
 tracker.step(result([['Right',.8]]),'any',true);
 const mislabeled=tracker.step(result([['Left',.8]]),'any',true);
 assert.ok(mislabeled.every(p=>Number.isNaN(p.x)));
 const restored=tracker.step(result([['Left',.2],['Right',.8]]),'any',true);
 assert.equal(restored[8].x,.2);assert.equal(restored[29].x,.8);
});

test('either-hand smoothing resets when control moves to the other hand',()=>{
 const tracker=new CoordinateHands();
 const sampler=new CoordinateSampler('hand',{points:[8],axes:'xy',hz:10,smoothing:.7,named:true});
 sampler.step(tracker.step(result([['Left',.2]]),'any',false,0),0);
 assert.equal(sampler.step(tracker.step(result([['Right',.8]]),'any',false,100),100).frame,null);
 const right=sampler.step(tracker.step(result([['Right',.8]]),'any',false,400),400).frame!;
 assert.equal(right.points[0].x,.2);
});

test('a clock reset does not silence two-hand output',()=>{
 const sampler=new CoordinateSampler('hand',{handMode:'dual',points:[8,29],axes:'xy',hz:10,smoothing:0,named:true});
 const points=[...hand(.2),...hand(.8)];
 assert.equal(sampler.step(points,1000).due,true);
 assert.equal(sampler.step(points,10).due,true);
 assert.equal(sampler.step(points,NaN).frame,null);
});

test('single and dual selections and custom names survive repeated switching and JSON round trips',async()=>{
 const {switchCoordinateHands}=await import('./coordinates');
 const original={hand:'right' as const,points:[8,0],names:{8:'pitch',0:'wrist'},axes:'xy' as const,hz:10,smoothing:.7,named:false};
 const dual=switchCoordinateHands(original,'dual');
 assert.deepEqual(dual.points,[29,21]);
 const edited=cleanCoordinateConfig('hand',{...dual,points:[29,8],names:{29:'right_volume',8:'left_pitch'}});
 const single=switchCoordinateHands(edited,'single');
 assert.deepEqual(single.points,original.points);assert.deepEqual(single.names,original.names);assert.equal(single.named,false);
 const saved=cleanCoordinateConfig('hand',JSON.parse(JSON.stringify(single)));
 const restored=switchCoordinateHands(saved,'dual');
 assert.deepEqual(restored.points,edited.points);assert.deepEqual(restored.names,edited.names);
 assert.deepEqual(switchCoordinateHands(restored,'single').names,original.names);
});

test('persistent relabelling of a remaining hand stays paused until identity is resolved',()=>{
 const tracker=new CoordinateHands();
 tracker.step(result([['Left',.2],['Right',.8]]),'any',true,0);
 tracker.step(result([['Right',.8]]),'any',true,100);
 for(const now of [200,600,1200,2000]){
   assert.ok(tracker.step(result([['Left',.8]]),'any',true,now).every(p=>Number.isNaN(p.x)));
 }
 const restored=tracker.step(result([['Left',.2],['Right',.8]]),'any',true,2100);
 assert.equal(restored[8].x,.2);assert.equal(restored[29].x,.8);
 tracker.step(result([]),'any',true,2200);
 tracker.step(result([]),'any',true,3300);
 assert.equal(tracker.step(result([['Left',.8]]),'any',true,3400)[8].x,.8);
});

test('an imported dual project can return to single when its preferred hand has no points',async()=>{
 const {switchCoordinateHands}=await import('./coordinates');
 const config={handMode:'dual' as const,hand:'right' as const,points:[8],axes:'xy' as const,hz:10,smoothing:0,named:true};
 assert.deepEqual(switchCoordinateHands(config,'single').points,[8]);
});
