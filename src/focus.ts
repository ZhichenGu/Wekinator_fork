import {extract,type Frame,type Mode,type Project,type Point} from './core';
import {landmarkIds,validLandmark} from './region';
export const recommendedPoints=(mode:Mode)=>mode==='pose'?[11,12,13,14,15,16,23,24,25,26,27,28]:landmarkIds(mode).sort((a,b)=>a-b);
export const focusPresets=(mode:Mode)=>mode==='hand'?[{name:'整只手',ids:recommendedPoints(mode)},{name:'拇指与食指',ids:[0,1,2,3,4,5,6,7,8]}]:mode==='face'?[{name:'嘴部',ids:[13,14,61,291]},{name:'眼部',ids:[33,133,263,362]}]:[{name:'上半身',ids:[11,12,13,14,15,16,23,24]},{name:'手臂',ids:[11,12,13,14,15,16]}];
export function validFocus(mode:Mode,ids:unknown):ids is number[]{return Array.isArray(ids)&&ids.length>=1&&ids.length<=33&&new Set(ids).size===ids.length&&ids.every(id=>validLandmark(mode,id))&&ids.every((id,i)=>!i||id>ids[i-1]);}
/** Keep original landmarks and face coefficients; focus changes only the feature vector and trajectory center. */
export function focusedFrame(mode:Mode,points:Point[],ids:number[],t:number,blend:number[]=[]):Frame|null{
 if(!validFocus(mode,ids))return null;
 const anchors=mode==='hand'?[0,9]:mode==='face'?[1,33,263]:[11,12,23,24];
 if([...ids,...anchors].some(id=>!points[id]||!Number.isFinite(points[id].x)||!Number.isFinite(points[id].y)||(mode==='pose'&&(points[id].visibility??1)<.45)))return null;
 const origin=mode==='hand'?points[0]:mode==='face'?points[1]:{x:(points[23].x+points[24].x)/2,y:(points[23].y+points[24].y)/2};
 const end=mode==='hand'?points[9]:mode==='face'?points[263]:{x:(points[11].x+points[12].x)/2,y:(points[11].y+points[12].y)/2};
 const start=mode==='face'?points[33]:origin,scale=Math.hypot(start.x-end.x,start.y-end.y);if(scale<.015)return null;
 const shape=ids.flatMap(id=>[(points[id].x-origin.x)/scale,(points[id].y-origin.y)/scale]);
 const root:[number,number]=[ids.reduce((sum,id)=>sum+points[id].x,0)/ids.length,ids.reduce((sum,id)=>sum+points[id].y,0)/ids.length];
 return {t,points,shape,root,scale,...(mode==='face'?{blend}:{} )};
}
export function frameBlend(frame:Frame|null):number[]{return frame?.blend??(frame?.shape.slice(24).map(v=>v/1.5)??[]);}
export function changeFocus(project:Project,focus:number[]|undefined):Project{
 if(focus!==undefined&&!validFocus(project.mode,focus))throw new Error('请至少选择一个有效骨骼点。');
 const actions=project.actions.map(action=>({...action,trained:false,samples:action.samples.map(sample=>({...sample,frames:sample.frames.map(frame=>{
  const next=focus?focusedFrame(project.mode,frame.points,focus,frame.t,frameBlend(frame)):extract(project.mode,frame.points,frameBlend(frame),frame.t);
  if(!next)throw new Error('已有录制缺少所选部位的有效点，请保留当前设置或移除对应录制后再修改。');return next;
 })}))}));
 return {...project,focus,actions};
}
