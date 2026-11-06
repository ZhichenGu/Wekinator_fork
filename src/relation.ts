import type {Frame,Mode} from './core';
export type RelationConfig={rule:'distance'|'above';threshold:number;seconds:number};
export const DEFAULT_RELATION:RelationConfig={rule:'distance',threshold:.5,seconds:.35};
export function validRelation(r:RelationConfig){return !!r&&['distance','above'].includes(r.rule)&&Number.isFinite(r.threshold)&&r.threshold>=.05&&r.threshold<=5&&Number.isFinite(r.seconds)&&r.seconds>=.1&&r.seconds<=60;}
export function relationValue(mode:Mode,f:Frame|null,r:RelationConfig):boolean|null{
 if(!f||!validRelation(r)||f.scale<.015)return null;
 const ids=mode==='hand'?[4,8]:mode==='face'?[13,14]:[15,16];const [a,b]=ids.map(i=>f.points[i]);
 if(!a||!b||[a,b].some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||(p.visibility??1)<.45))return null;
 if(r.rule==='distance')return Math.hypot(a.x-b.x,a.y-b.y)/f.scale<=r.threshold;
 if(mode==='pose'){const shoulders=[f.points[11],f.points[12]];if(shoulders.some(p=>!p||(p.visibility??1)<.45))return null;return a.y<shoulders[0].y&&b.y<shoulders[1].y;}
 return a.y<b.y;
}
