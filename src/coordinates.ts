import type {Mode,Point} from './core';
import {validLandmark} from './region';

export type CoordinateConfig={points:number[];axes:'xy'|'xyz';hz:number;smoothing:number};
export type CoordinatePoint={id:number;x:number;y:number;z?:number};
export type CoordinateFrame={mode:Mode;t:number;points:CoordinatePoint[]};
export const defaultCoordinates=(mode:Mode):CoordinateConfig=>({
  points:[mode==='hand'?8:mode==='face'?1:15],axes:'xy',hz:10,smoothing:.35
});
export function cleanCoordinateConfig(mode:Mode,value:CoordinateConfig):CoordinateConfig {
  if(!value||!Array.isArray(value.points)||value.points.length<1||value.points.length>4||
    new Set(value.points).size!==value.points.length||value.points.some(id=>!validLandmark(mode,id))||
    !['xy','xyz'].includes(value.axes)||!Number.isInteger(value.hz)||value.hz<1||value.hz>30||
    !Number.isFinite(value.smoothing)||value.smoothing<0||value.smoothing>.9)throw Error('坐标设置无效。');
  return {points:[...value.points],axes:value.axes,hz:value.hz,smoothing:value.smoothing};
}
const rounded=(n:number)=>Math.round(n*100000)/100000;
export class CoordinateSampler {
  private previous:CoordinatePoint[]|null=null;
  private time=-Infinity;
  private sent=-Infinity;
  constructor(readonly mode:Mode,readonly config:CoordinateConfig) {cleanCoordinateConfig(mode,config);}
  reset(){this.previous=null;this.time=-Infinity;this.sent=-Infinity;}
  step(points:Point[],now:number):{frame:CoordinateFrame|null;due:boolean} {
    const selected=this.config.points.map(id=>points[id]);
    if(!Number.isFinite(now)||selected.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||
      (this.mode==='pose'&&(p.visibility??1)<.45)||
      (this.config.axes==='xyz'&&(!Number.isFinite(p.z)||Math.abs(p.z!)>100)))) {
      this.reset();return {frame:null,due:false};
    }
    if(now<this.time||now-this.time>350)this.reset();
    const weight=this.config.smoothing;
    const result=selected.map((p,i)=>{
      const last=this.previous?.[i];
      const blend=(v:number,old?:number)=>rounded(old===undefined?v:old*weight+v*(1-weight));
      return {id:this.config.points[i],x:blend(Math.max(0,Math.min(1,1-p.x)),last?.x),
        y:blend(Math.max(0,Math.min(1,p.y)),last?.y),
        ...(this.config.axes==='xyz'?{z:blend(p.z!,last?.z)}:{})};
    });
    this.previous=result;this.time=now;
    const due=now-this.sent>=1000/this.config.hz;
    if(due)this.sent=now;
    return {frame:{mode:this.mode,t:Math.round(now),points:result},due};
  }
}
export const coordinateText=(frame:CoordinateFrame)=>JSON.stringify(frame);
export const coordinateOsc=(frame:CoordinateFrame)=>frame.points.map(p=>({
  id:p.id,values:p.z===undefined?[p.x,p.y]:[p.x,p.y,p.z]
}));
