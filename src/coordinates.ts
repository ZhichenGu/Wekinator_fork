import type {Mode,Point} from './core';
import {validLandmark} from './region';

export type CoordinateAxis='x'|'y'|'z';
export type CoordinateConfig={points:number[];axes:'xy'|'xyz';hz:number;smoothing:number;named?:boolean;names?:Record<string,string>;enabledAxes?:CoordinateAxis[]};
export const coordinateAxes=(config:CoordinateConfig):CoordinateAxis[]=>config.enabledAxes??(config.axes==='xyz'?['x','y','z']:['x','y']);
export function coordinateName(mode:Mode,id:number,config:CoordinateConfig):string {
  const defaults:Partial<Record<Mode,Record<number,string>>>={hand:{0:'wrist',4:'thumb_tip',8:'index_tip',12:'middle_tip',16:'ring_tip',20:'pinky_tip'},face:{1:'nose_tip',13:'upper_lip',14:'lower_lip'},pose:{15:'left_wrist',16:'right_wrist',23:'left_hip',24:'right_hip'}};
  return config.names?.[String(id)]??defaults[mode]?.[id]??'point_'+id;
}
export const validCoordinateName=(name:string)=>/^[A-Za-z][A-Za-z0-9_]{0,15}$/.test(name);
export type CoordinatePoint={id:number;x:number;y:number;z?:number};
export type CoordinateFrame={mode:Mode;t:number;points:CoordinatePoint[]};
export const defaultCoordinates=(mode:Mode):CoordinateConfig=>({
  points:[mode==='hand'?8:mode==='face'?1:15],axes:'xy',hz:10,smoothing:.35,named:true
});
export function cleanCoordinateConfig(mode:Mode,value:CoordinateConfig):CoordinateConfig {
  if(!value||!Array.isArray(value.points)||value.points.length<1||value.points.length>4||
    new Set(value.points).size!==value.points.length||value.points.some(id=>!validLandmark(mode,id))||
    !['xy','xyz'].includes(value.axes)||!Number.isInteger(value.hz)||value.hz<1||value.hz>30||
    !Number.isFinite(value.smoothing)||value.smoothing<0||value.smoothing>.9)throw Error('坐标设置无效。');
  if(value.named!==undefined&&typeof value.named!=='boolean')throw Error('坐标设置无效。');
  if(value.enabledAxes!==undefined&&(!Array.isArray(value.enabledAxes)||!value.enabledAxes.length||value.enabledAxes.length>3||new Set(value.enabledAxes).size!==value.enabledAxes.length||value.enabledAxes.some(axis=>!['x','y','z'].includes(axis))))throw Error('请至少选择一个坐标轴。');
  if(value.names!==undefined&&(!value.names||typeof value.names!=='object'||Array.isArray(value.names)||Object.entries(value.names).some(([id,name])=>!value.points.includes(Number(id))||String(Number(id))!==id||typeof name!=='string'||!validCoordinateName(name))))throw Error('输出名称需以字母开头，使用最多 16 个字母、数字或下划线。');
  const names=value.points.map(id=>coordinateName(mode,id,value));
  if(new Set(names).size!==names.length)throw Error('各检测点的输出名称需要不同。');
  return {points:[...value.points],axes:value.axes,hz:value.hz,smoothing:value.smoothing,
    ...(value.named!==undefined?{named:value.named}:{}),...(value.names?{names:{...value.names}}:{}),...(value.enabledAxes?{enabledAxes:[...value.enabledAxes]}:{})};
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
      (coordinateAxes(this.config).includes('z')&&(!Number.isFinite(p.z)||Math.abs(p.z!)>100)))) {
      this.reset();return {frame:null,due:false};
    }
    if(now<this.time||now-this.time>350)this.reset();
    const weight=this.config.smoothing;
    const result=selected.map((p,i)=>{
      const last=this.previous?.[i];
      const blend=(v:number,old?:number)=>rounded(old===undefined?v:old*weight+v*(1-weight));
      return {id:this.config.points[i],x:blend(Math.max(0,Math.min(1,1-p.x)),last?.x),
        y:blend(Math.max(0,Math.min(1,p.y)),last?.y),
        ...(coordinateAxes(this.config).includes('z')?{z:blend(p.z!,last?.z)}:{})};
    });
    this.previous=result;this.time=now;
    const due=now-this.sent>=1000/this.config.hz;
    if(due)this.sent=now;
    return {frame:{mode:this.mode,t:Math.round(now),points:result},due};
  }
}
export function coordinateText(frame:CoordinateFrame,config?:CoordinateConfig):string {
  if(!config?.named)return JSON.stringify(frame);
  const values:Record<string,number>={};
  for(const point of frame.points)for(const axis of coordinateAxes(config)) {
    const value=point[axis];
    if(value===undefined||!Number.isFinite(value))throw Error('坐标数据无效。');
    values[coordinateName(frame.mode,point.id,config)+'_'+axis]=value;
  }
  return JSON.stringify({mode:frame.mode,t:frame.t,values});
}
export function coordinateOsc(frame:CoordinateFrame,config?:CoordinateConfig) {
  return frame.points.map(point=>config?.named?{
    id:point.id,name:coordinateName(frame.mode,point.id,config),axes:coordinateAxes(config),
    values:coordinateAxes(config).map(axis=>point[axis]!)
  }:{id:point.id,values:point.z===undefined?[point.x,point.y]:[point.x,point.y,point.z]});
}
