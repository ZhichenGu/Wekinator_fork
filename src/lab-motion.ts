/** Experimental pipeline; no change to the legacy core matcher. */
import {recommendedPoints,frameBlend} from './focus';
import {buildTemplates,match,type Frame,type Project,type Sample,type Template,type FeatureMode} from './core';
export type LabOptions={features:boolean;trim:boolean;ensemble:boolean};
export const LAB_DEFAULTS:LabOptions={features:true,trim:true,ensemble:true};
export const labEnabled=(p:Project)=>(p.learning??'dynamic')==='dynamic'&&!!p.lab;
const rms=(a:number[],b:number[])=>a.length===b.length&&a.length?Math.sqrt(a.reduce((sum,v,i)=>sum+(v-b[i])**2,0)/a.length):Infinity;
/** Palm-axis coordinates preserve joint structure while removing in-plane rotation.
 * Finger bend cosines and fingertip separation supply explicit pinch/curl cues.
 * The original trajectory is deliberately retained in camera coordinates. */
export function handFeatures(frame:Frame,focus?:number[]):Frame|null{
 const p=frame.points;if(p.length<21)return null;
 if(frame.handCount===2){
   const left=handFeatures({...frame,handCount:1,points:p.slice(0,21)},focus),right=handFeatures({...frame,handCount:1,points:p.slice(21,42)},focus);
   if(!left||!right||!frame.handRoots)return null;
   const [lx,ly,rx,ry]=frame.handRoots,scale=frame.scale;
   return {...frame,shape:[...left.shape,...right.shape,(rx-lx)/scale,(ry-ly)/scale]};
 }
 const ids=focus??Array.from({length:21},(_,i)=>i);
 if([...ids,0,9].some(i=>!p[i]||!Number.isFinite(p[i].x)||!Number.isFinite(p[i].y)))return null;
 const aspect=frame.aspectRatio??1;if(!Number.isFinite(aspect)||aspect<=0)return null;
 const dx=(p[9].x-p[0].x)*aspect,dy=p[9].y-p[0].y,scale=Math.hypot(dx,dy);if(scale<.015)return null;
 const ux=dx/scale,uy=dy/scale;
 const xy=ids.flatMap(i=>{const x=(p[i].x-p[0].x)*aspect/scale,y=(p[i].y-p[0].y)/scale;return [x*uy-y*ux,x*ux+y*uy];});
 const bends:number[]=[];
 for(const chain of [[0,1,2,3,4],[0,5,6,7,8],[0,9,10,11,12],[0,13,14,15,16],[0,17,18,19,20]])for(let j=1;j<4;j++){
 const [a,b,c]=[chain[j-1],chain[j],chain[j+1]];if(![a,b,c].every(i=>ids.includes(i)))continue;
 const ax=(p[a].x-p[b].x)*aspect,ay=p[a].y-p[b].y,bx=(p[c].x-p[b].x)*aspect,by=p[c].y-p[b].y;
 bends.push((ax*bx+ay*by)/(Math.hypot(ax,ay)*Math.hypot(bx,by)||1));
 }
 const tips=[4,8,12,16,20].filter(i=>ids.includes(i)),distances:number[]=[];
 for(let i=0;i<tips.length;i++)for(let j=i+1;j<tips.length;j++)distances.push(Math.hypot((p[tips[i]].x-p[tips[j]].x)*aspect,p[tips[i]].y-p[tips[j]].y)/scale);
 // Equalize group contribution; adding dimensions must not drown out geometry.
 const groups=[xy,bends,distances].filter(g=>g.length),n=groups.reduce((sum,g)=>sum+g.length,0);
 return {...frame,shape:groups.flatMap(g=>g.map(v=>v*Math.sqrt(n/(groups.length*g.length))))};
}
/** Body/face keep camera orientation: head tilt and arm direction can be deliberate signals.
 * Normalize translation and scale, correct image aspect, and add selected-point relations only. */
export function trackedFeatures(frame:Frame,project:Pick<Project,'mode'|'focus'>):Frame|null{
 if(project.mode==='hand')return handFeatures(frame,project.focus);
 const mode=project.mode,p=frame.points,ids=project.focus??recommendedPoints(mode),aspect=frame.aspectRatio??1;
 const anchors=mode==='face'?[1,33,263]:[11,12,23,24];
 if(!ids.length||!Number.isFinite(aspect)||aspect<=0||[...ids,...anchors].some(i=>!p[i]||!Number.isFinite(p[i].x)||!Number.isFinite(p[i].y)||(mode==='pose'&&(p[i].visibility??1)<.45)))return null;
 const origin=mode==='face'?p[1]:{x:(p[23].x+p[24].x)/2,y:(p[23].y+p[24].y)/2};
 const start=mode==='face'?p[33]:origin,end=mode==='face'?p[263]:{x:(p[11].x+p[12].x)/2,y:(p[11].y+p[12].y)/2};
 const scale=Math.hypot((end.x-start.x)*aspect,end.y-start.y);if(scale<.015)return null;
 const geometry=ids.flatMap(i=>[(p[i].x-origin.x)*aspect/scale,(p[i].y-origin.y)/scale]);
 const relations:number[]=[];
 if(mode==='pose'){
  for(const [a,b,c] of [[11,13,15],[12,14,16],[23,25,27],[24,26,28],[13,11,23],[14,12,24]]){
   if(![a,b,c].every(i=>ids.includes(i)))continue;
   const ax=(p[a].x-p[b].x)*aspect,ay=p[a].y-p[b].y,bx=(p[c].x-p[b].x)*aspect,by=p[c].y-p[b].y;
   const length=Math.hypot(ax,ay)*Math.hypot(bx,by);relations.push(length>1e-8?(ax*bx+ay*by)/length:0);
  }
 }else{
  for(const [a,b] of [[13,14],[61,291],[33,133],[263,362],[145,159],[374,386]])if(ids.includes(a)&&ids.includes(b))relations.push(Math.hypot((p[a].x-p[b].x)*aspect,p[a].y-p[b].y)/scale);
 }
 // Explicit focus excludes unrelated expression coefficients. Legacy recordings retain them.
 const expressions=mode==='face'&&project.focus===undefined?frameBlend(frame):[];
 if(expressions.some(v=>!Number.isFinite(v)))return null;
 const groups=[geometry,relations,expressions].filter(g=>g.length),n=groups.reduce((sum,g)=>sum+g.length,0);
 return {...frame,shape:groups.flatMap(g=>g.map(v=>v*Math.sqrt(n/(groups.length*g.length))))};
}
export function labFrames(frames:Frame[],project:Project):Frame[]{
 if(!project.lab?.features)return frames;
 const output=frames.map(f=>trackedFeatures(f,project));return output.some(f=>!f)?[]:output as Frame[];
}
export type MotionClip={frames:Frame[];start:number;end:number};
/** Conservative motion cropping of real frames only. No interpolation or fabricated data. */
export function motionClip(frames:Frame[],feature:FeatureMode,latest=false):MotionClip|null{
 if(frames.length<10||frames.some((f,i)=>i>0&&(f.t<=frames[i-1].t||f.t-frames[i-1].t>220)))return null;
 const speed=frames.slice(1).map((f,i)=>{const a=frames[i],dt=(f.t-a.t)/1000;
 const shape=rms(f.shape,a.shape),path=(f.handRoots&&a.handRoots?Math.hypot(...f.handRoots.map((v,k)=>v-a.handRoots![k]))/Math.SQRT2:Math.hypot(f.root[0]-a.root[0],f.root[1]-a.root[1]))/Math.max(.015,(f.scale+a.scale)/2);
 return (feature==='shape'?shape:feature==='path'?path:Math.sqrt((shape*shape+path*path)/2))/dt;});
 const sorted=[...speed].sort((a,b)=>a-b),peak=sorted[Math.floor((sorted.length-1)*.9)];
 const threshold=Math.max(.12,Math.min(.8,peak*.15));
 const active=speed.map((v,i)=>v>=threshold?i+1:-1).filter(i=>i>=0);if(active.length<2)return null;
 let first=active[0],last=active.at(-1)!;
 if(latest){for(let i=active.length-1;i>0;i--)if(frames[active[i]].t-frames[active[i-1]].t>650){first=active[i];break;}}
 const startTime=frames[first-1].t-100,endTime=frames[last].t+100;
 const selected=frames.filter(f=>f.t>=startTime&&f.t<=endTime);
 if(selected.length<10||selected.at(-1)!.t-selected[0].t<500)return null;
 return {frames:selected,start:selected[0].t,end:selected.at(-1)!.t};
}
export function labSample(sample:Sample,project:Project):Sample|null{
 const transformed=labFrames(sample.frames.map(f=>({...f,aspectRatio:f.aspectRatio??sample.aspectRatio??1})),project);if(!transformed.length)return null;
 const clip=project.lab?.trim?motionClip(transformed,project.feature):{frames:transformed};
 if(!clip)return null;return {...sample,frames:clip.frames,duration:clip.frames.at(-1)!.t-clip.frames[0].t};
}
export function buildLabTemplates(project:Project):Template[]{
 const actions=project.actions.map(a=>({...a,samples:a.samples.filter(s=>s.split!=='test').flatMap(s=>{const next=labSample(s,project);return next?[next]:[];})}));
 return buildTemplates(actions,project.feature);
}
export function labMatch(buffer:Frame[],templates:Template[],project:Project):Record<string,number>{
 let frames=labFrames(buffer,project);if(!frames.length)return {};
 if(project.lab?.trim){const clip=motionClip(frames,project.feature,true);if(!clip||frames.at(-1)!.t-clip.end>450)return {};frames=clip.frames;}
 if(!project.lab?.ensemble)return match(frames,templates,project.feature);
 const positives=templates.filter(t=>!t.negative),negatives=templates.filter(t=>t.negative),byAction=new Map<string,number[]>();
 for(const template of positives){const score=match(frames,[template,...negatives.filter(n=>n.actionId===template.actionId)],project.feature)[template.actionId]??0;byAction.set(template.actionId,[...(byAction.get(template.actionId)??[]),score]);}
 // Two supporting examples resist a single accidental high match. One-example projects still work.
 return Object.fromEntries([...byAction].map(([id,scores])=>{scores.sort((a,b)=>b-a);const near=scores.slice(0,Math.min(2,scores.length));return [id,near.reduce((s,v)=>s+v,0)/near.length];}));
}
