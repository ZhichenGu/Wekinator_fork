import test from 'node:test';import assert from 'node:assert/strict';
import {extract,buildTemplates,type Frame,type Project,type Action,type Sample} from './core';
import {handFeatures,motionClip,buildLabTemplates,labMatch,LAB_DEFAULTS} from './lab-motion';
import {Recognizer} from './learning';
function points(amount=0){return Array.from({length:21},(_,i)=>i===0?{x:.5,y:.75}:{x:.32+Math.floor((i-1)/4)*.075+(i===8?amount:0),y:.65-((i-1)%4)*.06});}
function frame(t:number,amount=0):Frame{return {...extract('hand',points(amount),[],t)!,aspectRatio:4/3};}
function recording(id:string,kind='pinch',padding=500):Sample{const frames=Array.from({length:41+padding/25},(_,i)=>{const t=i*50,u=Math.max(0,Math.min(1,(t-padding)/1500));const f=frame(t,(kind==='pinch'?.1:.04)*Math.sin(u*Math.PI*2));if(kind==='circle')f.root=[.5+.06*(Math.cos(u*Math.PI*2)-1),.7+.06*Math.sin(u*Math.PI*2)];return f;});return {id,frames,duration:frames.at(-1)!.t,negative:false,split:'train',aspectRatio:4/3};}
const action=(samples:Sample[],id='a'):Action=>({id,name:id,effect:'indicator',color:'#dddddd',trained:true,threshold:.8,samples});
const project=(samples:Sample[]):Project=>({schemaVersion:1,name:'lab',mode:'hand',learning:'dynamic',feature:'both',actions:[action(samples)],lab:{...LAB_DEFAULTS},updatedAt:'2026-11-09'});
test('hand features resist translation, scale and in-plane rotation with camera aspect correction',()=>{
 const original=frame(0,.03),a=handFeatures(original)!;const ratio=4/3,angle=.6;
 const transformed={...original,points:original.points.map(p=>{const x=(p.x-.5)*ratio,y=p.y-.75;return {x:.55+1.2*(x*Math.cos(angle)-y*Math.sin(angle))/ratio,y:.6+1.2*(x*Math.sin(angle)+y*Math.cos(angle))};})};
 const b=handFeatures(transformed)!;assert.equal(a.shape.length,b.shape.length);assert.ok(a.shape.every((v,i)=>Math.abs(v-b.shape[i])<1e-8));assert.deepEqual(b.root,original.root);
 assert.equal(handFeatures({...original,points:[]}),null);
});
test('focus excludes unrelated finger motion while explicit pinch features change with the tips',()=>{
 const first=frame(0),second=frame(50,.08);assert.notDeepEqual(handFeatures(first)!.shape,handFeatures(second)!.shape);
 assert.deepEqual(handFeatures(first,[0,9,10,11,12])!.shape,handFeatures(second,[0,9,10,11,12])!.shape);
});
test('motion segmentation cuts idle margins without inventing frames or accepting sparse tracking',()=>{
 const s=recording('s'),clip=motionClip(s.frames,'both')!;assert.ok(clip);assert.ok(clip.start>0);assert.ok(clip.end<s.duration);assert.ok(clip.frames.every(f=>s.frames.includes(f)));
 assert.equal(motionClip(Array.from({length:30},(_,i)=>frame(i*50)),'shape'),null);
 assert.equal(motionClip(s.frames.filter((_,i)=>i<12||i>20),'both'),null);
 const short=[frame(0),frame(50,.02),frame(100,.04)];assert.equal(motionClip(short,'shape'),null);
});
test('lab templates use training only, preserve raw samples, and retain trajectory direction',()=>{
 const s=recording('train'),p=project([s,{...recording('test'),split:'test'}]);const before=JSON.stringify(p);const templates=buildLabTemplates(p);assert.equal(templates.length,1);assert.ok(templates[0].duration<s.duration);assert.equal(JSON.stringify(p),before);
 const normal=handFeatures(s.frames[18])!,moved=handFeatures({...s.frames[18],root:[.1,.2]})!;assert.deepEqual(normal.shape,moved.shape);assert.notDeepEqual(normal.root,moved.root);
});
test('multi-example matching requires support rather than trusting one accidental nearest template',()=>{
 const frames=Array.from({length:31},(_,i)=>({t:i*50,points:[],shape:[i/30],root:[i*.002,0] as [number,number],scale:.1}));
 const good={id:'good',frames,duration:1500,negative:false};const bad={...good,id:'bad',frames:frames.map(f=>({...f,shape:f.shape.map(v=>v+2)}))};
 const p={...project([good,bad]),feature:'shape' as const,lab:{features:false,trim:false,ensemble:true}};const templates=buildTemplates(p.actions,p.feature);
 const enhanced=labMatch(frames,templates,p).a,baseline=labMatch(frames,templates,{...p,lab:{...p.lab,ensemble:false}}).a;
 assert.ok(baseline>.99);assert.ok(enhanced<.7);assert.equal(labMatch(frames,templates.slice(0,1),p).a,baseline);
});
test('enhanced runtime and offline recognizer recognize a separately transformed complete gesture',()=>{
 const s=recording('train'),p=project([s]);const recognizer=new Recognizer(p);assert.ok(recognizer.ready);
 const probe=recording('probe');const events:string[]=[];
 for(const f of probe.frames){const out=recognizer.step({...f,points:f.points.map(p=>({x:p.x+.025,y:p.y-.02}))},f.t);if(out.eventId)events.push(out.eventId);}
 assert.deepEqual(events,['a']);
});

test('explicit baseline choice and experimental flags survive project validation and JSON export',async()=>{
 const {validateProject}=await import('./core');const p={...project([recording('x')]),lab:undefined,labBaseline:true};
 const restored=validateProject(JSON.parse(JSON.stringify(p)));assert.equal(restored.lab,undefined);assert.equal(restored.labBaseline,true);
 assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project([recording('x')])))).lab,LAB_DEFAULTS);
 assert.throws(()=>validateProject({...p,lab:{features:'yes',trim:true,ensemble:true}}));
});
test('idle input and a tracking loss cannot create an extra completed gesture',()=>{
 const s=recording('train'),p=project([s]),r=new Recognizer(p);let fires=0;
 for(const f of s.frames)if(r.step(f,f.t).eventId)fires++;
 for(let t=s.duration+50;t<s.duration+2500;t+=50)if(r.step(frame(t),t).eventId)fires++;
 assert.equal(fires,1);
 const lost=new Recognizer(p);for(const f of s.frames.slice(0,10))lost.step(f,f.t);lost.step(null,2000);
 assert.equal(lost.step(frame(2100),2100).eventId,null);
});

test('face and body enhancement normalize position and scale, retain orientation, and honor focus',async()=>{
 const {trackedFeatures,labEnabled}=await import('./lab-motion');
 for(const mode of ['face','pose'] as const){
  const pts=mode==='face'?Array.from({length:478},(_,i)=>({x:.3+(i%17)*.013,y:.3+(i%13)*.017,visibility:1})):Array.from({length:33},(_,i)=>({x:.3+(i%5)*.06,y:.2+Math.floor(i/5)*.07,visibility:1}));
  if(mode==='face'){pts[33]={x:.3,y:.4,visibility:1};pts[263]={x:.6,y:.4,visibility:1};}
  else{pts[11]={x:.35,y:.3,visibility:1};pts[12]={x:.6,y:.3,visibility:1};pts[23]={x:.4,y:.65,visibility:1};pts[24]={x:.55,y:.65,visibility:1};}
  const f={...extract(mode,pts,[.1,.5],0)!,aspectRatio:4/3},config={mode,focus:mode==='face'?[13,14]:[11,13,15]};
  const a=trackedFeatures(f,config)!;assert.ok(a);
  const translated={...f,points:pts.map(p=>({...p,x:p.x*1.1+.02,y:p.y*1.1-.04}))};
  const b=trackedFeatures(translated,config)!;a.shape.forEach((v,i)=>assert.ok(Math.abs(v-b.shape[i])<1e-8));
  const unrelated={...f,points:pts.map((p,i)=>i===(mode==='face'?152:28)?{...p,x:p.x+.1}:p),blend:[1,0]};
  assert.deepEqual(trackedFeatures(unrelated,config)!.shape,a.shape);
  const changed={...f,points:pts.map((p,i)=>i===(mode==='face'?14:15)?{...p,x:p.x+.1}:p)};
  assert.notDeepEqual(trackedFeatures(changed,config)!.shape,a.shape);
  const rotated={...f,points:pts.map(p=>({...p,x:.5-(p.y-.5)/(4/3),y:.5+(p.x-.5)*(4/3)}))};
  assert.notDeepEqual(trackedFeatures(rotated,config)!.shape,a.shape);
  const invalid={...f,points:pts.map((p,i)=>i===(mode==='face'?33:23)?{...p,x:NaN}:p)};assert.equal(trackedFeatures(invalid,config),null);
  if(mode==='pose'){const hidden={...f,points:pts.map((p,i)=>i===15?{...p,visibility:0}:p)};assert.equal(trackedFeatures(hidden,config),null);}
  assert.ok(labEnabled({...project([]),mode}));assert.equal(labEnabled({...project([]),mode,learning:'pose'}),false);
 }
});

test('face and body dynamic templates and runtime share the enhanced pipeline without changing raw samples',()=>{
 for(const mode of ['face','pose'] as const){
  const frames=Array.from({length:61},(_,i)=>{
   const pts=mode==='face'?Array.from({length:478},(_,j)=>({x:.3+(j%17)*.013,y:.3+(j%13)*.017,visibility:1})):Array.from({length:33},(_,j)=>({x:.3+(j%5)*.06,y:.2+Math.floor(j/5)*.07,visibility:1}));
   if(mode==='face'){pts[33]={x:.3,y:.4,visibility:1};pts[263]={x:.6,y:.4,visibility:1};pts[14].y+=.06*Math.sin(i/60*Math.PI*2);}
   else{pts[11]={x:.35,y:.3,visibility:1};pts[12]={x:.6,y:.3,visibility:1};pts[23]={x:.4,y:.65,visibility:1};pts[24]={x:.55,y:.65,visibility:1};pts[15].x+=.15*Math.sin(i/60*Math.PI*2);}
   return {...extract(mode,pts,[],i*50)!,aspectRatio:4/3};
  });
  const train={id:'train',frames,duration:3000,negative:false,split:'train' as const};
  const p={...project([train,{...train,id:'test',split:'test' as const}]),mode,focus:mode==='face'?[13,14]:[11,13,15],feature:'shape' as const};
  const before=JSON.stringify(p),templates=buildLabTemplates(p);assert.equal(templates.length,1,mode);assert.equal(JSON.stringify(p),before);
  const recognizer=new Recognizer(p);assert.ok(recognizer.ready);const events:string[]=[];
  for(const f of frames){const probe={...f,points:f.points.map(pt=>({...pt,x:pt.x*1.05+.02,y:pt.y*1.05-.01}))};const result=recognizer.step(probe,f.t);if(result.eventId)events.push(result.eventId);}
  assert.deepEqual(events,['a'],mode);
 }
});
