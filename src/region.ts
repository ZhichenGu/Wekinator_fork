export type RegionConfig={x:number;y:number;width:number;height:number;seconds:number};
export const DEFAULT_REGION:RegionConfig={x:.25,y:.25,width:.5,height:.5,seconds:1};
export function validRegion(r:RegionConfig):boolean{return !!r&&Object.values(r).every(Number.isFinite)&&r.x>=0&&r.y>=0&&r.width>=.05&&r.height>=.05&&r.x+r.width<=1.000001&&r.y+r.height<=1.000001&&r.seconds>=.1&&r.seconds<=60;}
/** Coordinates match the mirrored camera image. Missing frames interrupt dwell without rearming. */
export class DwellGate{
 private since:number|null=null;private fired=false;private last:number|null=null;private outside:number|null=null;
 step(point:[number,number]|null,now:number,r:RegionConfig){
  if(!validRegion(r)||!Number.isFinite(now))return {fire:false,progress:0,state:'等待目标'};
  if(this.last!==null&&(now-this.last>350||now<this.last))this.since=null;this.last=now;
  if(!point||point.some(v=>!Number.isFinite(v))){this.since=null;this.outside=null;return {fire:false,progress:0,state:'等待目标'};}
  const inside=point[0]>=r.x&&point[0]<=r.x+r.width&&point[1]>=r.y&&point[1]<=r.y+r.height;
  if(!inside){this.since=null;this.outside??=now;if(now-this.outside>=200)this.fired=false;return {fire:false,progress:0,state:'区域外'};}
  this.outside=null;this.since??=now;const progress=Math.min(1,(now-this.since)/(r.seconds*1000));const fire=progress>=1&&!this.fired;if(fire)this.fired=true;return {fire,progress,state:this.fired?'已触发，请移出区域':'区域内停留中'};
 }
}
