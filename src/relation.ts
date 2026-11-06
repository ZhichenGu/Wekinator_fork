import type {Frame,Mode} from './core';
import {validLandmark} from './region';
export const defaultRelationPoints=(mode:Mode):[number,number]=>mode==='hand'?[4,8]:mode==='face'?[13,14]:[15,16];
export function selectRelationPoint(pair:[number,number],slot:0|1,id:number):[number,number]{const next:[number,number]=[...pair];if(next[1-slot]===id)next[1-slot]=pair[slot];next[slot]=id;return next;}
export type RelationConfig={rule:'distance'|'above';threshold:number;seconds:number;points?:[number,number]};
export const DEFAULT_RELATION:RelationConfig={rule:'distance',threshold:.5,seconds:.35};
export function validRelation(r:RelationConfig){return !!r&&(r.points===undefined||(Array.isArray(r.points)&&r.points.length===2&&r.points[0]!==r.points[1]&&r.points.every(i=>Number.isInteger(i)&&i>=0&&i<478)))&&['distance','above'].includes(r.rule)&&Number.isFinite(r.threshold)&&r.threshold>=.05&&r.threshold<=5&&Number.isFinite(r.seconds)&&r.seconds>=.1&&r.seconds<=60;}
export function relationValue(mode:Mode,f:Frame|null,r:RelationConfig):boolean|null{
 if(!f||!validRelation(r)||f.scale<.015)return null;
 const ids=r.points??defaultRelationPoints(mode);if(ids.some(id=>!validLandmark(mode,id)))return null;const [a,b]=ids.map(i=>f.points[i]);
 if(!a||!b||[a,b].some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||(mode==='pose'&&(p.visibility??1)<.45)))return null;
 if(r.rule==='distance')return Math.hypot(a.x-b.x,a.y-b.y)/f.scale<=r.threshold;
 if(mode==='pose'&&!r.points){const shoulders=[f.points[11],f.points[12]];if(shoulders.some(p=>!p||(mode==='pose'&&(p.visibility??1)<.45)))return null;return a.y<shoulders[0].y&&b.y<shoulders[1].y;}
 return a.y<b.y;
}
/** Rule evaluation needs the selected points and reference scale, not a trainable full-body frame. */
export function relationFrame(mode:Mode,points:Frame['points']):Frame|null {
 const ids=mode==='hand'?[0,9]:mode==='face'?[33,263]:[11,12,23,24];
 if(ids.some(id=>!points[id]||!Number.isFinite(points[id].x)||!Number.isFinite(points[id].y)||(mode==='pose'&&(points[id].visibility??1)<.45)))return null;
 const a=points[ids[0]],b=mode==='pose'?{x:(points[23].x+points[24].x)/2,y:(points[23].y+points[24].y)/2}:points[ids[1]];
 const origin=mode==='pose'?{x:(points[11].x+points[12].x)/2,y:(points[11].y+points[12].y)/2}:a;
 return {points,t:0,root:[origin.x,origin.y],shape:[],scale:Math.hypot(origin.x-b.x,origin.y-b.y)};
}
export function relationDistance(f:Frame|null,mode:Mode,r:RelationConfig):number|null {
 if(!f||f.scale<.015)return null;const pair=r.points??defaultRelationPoints(mode),a=f.points[pair[0]],b=f.points[pair[1]];
 if(!a||!b||[a,b].some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||(mode==='pose'&&(p.visibility??1)<.45)))return null;
 return Math.hypot(a.x-b.x,a.y-b.y)/f.scale;
}
