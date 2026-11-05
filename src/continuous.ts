import type {Action,Frame} from './core';
import {medianVector,poseQuality,vectorDistance} from './learning';
export type Anchor={vector:number[];value:number};
export function buildAnchors(actions:Action[]):Anchor[]{
 const anchors=actions.filter(a=>a.trained).flatMap(a=>a.samples.filter(s=>s.split!=='test'&&!s.negative&&poseQuality(s).valid).map(s=>({vector:medianVector(s.frames),value:a.controlValue??0})));
 if(new Set(anchors.map(a=>a.value)).size<2)throw new Error('至少训练两个不同目标数值的稳定姿态。');
 for(const a of anchors)for(const b of anchors){if(a.vector.length!==b.vector.length)throw new Error('示例维度不一致，请重新录制。');if(a.value!==b.value&&vectorDistance(a.vector,b.vector)<.03)throw new Error('不同数值的姿态过于相似，请重新示范。');}
 return anchors.filter((a,i)=>anchors.findIndex(b=>b.value===a.value&&vectorDistance(a.vector,b.vector)<.00001)===i);
}
export function predictValue(shape:number[],anchors:Anchor[]):number|null{
 if(!shape.length||shape.some(v=>!Number.isFinite(v))||anchors.some(a=>a.vector.length!==shape.length))return null;
 const sorted=anchors.map(a=>({...a,d:vectorDistance(shape,a.vector)})).sort((a,b)=>a.d-b.d);if(!sorted.length)return null;
 const extent=Math.max(...anchors.map(a=>vectorDistance(a.vector,sorted[0].vector)));
 if(sorted[0].d>Math.max(.15,extent*.85))return null;
 if(sorted[0].d<.00001)return sorted[0].value;
 const near=sorted.slice(0,4),weight=near.reduce((s,a)=>s+1/(a.d*a.d),0);
 return Math.max(0,Math.min(1,near.reduce((s,a)=>s+a.value/(a.d*a.d),0)/weight));
}
export class ContinuousController{
 value:number|null=null;private time=0;private emitted:number|null=null;private sentAt=-Infinity;
 constructor(public anchors:Anchor[]){}
 step(frame:Frame|null,now:number){const raw=frame?predictValue(frame.shape,this.anchors):null;if(raw===null){this.value=null;this.time=now;this.emitted=null;return {value:null,emit:false};}
 const dt=now-this.time;this.value=this.value===null||dt>350?raw:this.value+(raw-this.value)*(1-Math.exp(-Math.max(0,dt)/150));this.time=now;
 const emit=now-this.sentAt>=100&&(this.emitted===null||Math.abs(this.value-this.emitted)>=.01||now-this.sentAt>=1000);if(emit){this.sentAt=now;this.emitted=this.value;}return {value:this.value,emit};}
}
export const valueMessage=(text:string,value:number)=>text.includes('{value}')?text.replaceAll('{value}',value.toFixed(3)):value.toFixed(3);
