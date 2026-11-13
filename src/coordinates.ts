import type {Mode,Point} from './core';
import {coordinateHandSide,CoordinateHandChoice,type HandSide} from './coordinate-hands';
import {validLandmark} from './region';

export type CoordinateHandOutput='both'|'any'|'left'|'right';
export type CoordinateAxis='x'|'y'|'z';
type CoordinateSelection={points:number[];named?:boolean;names?:Record<string,string>};
export type CoordinateConfig={handScope?:'single'|'dual';outputHands?:CoordinateHandOutput;handProfiles?:Partial<Record<'single'|'dual',CoordinateSelection>>;handMode?:'single'|'dual';hand?:'any'|'left'|'right';points:number[];axes:'xy'|'xyz';hz:number;smoothing:number;named?:boolean;names?:Record<string,string>;enabledAxes?:CoordinateAxis[]};
export const coordinateAxes=(config:CoordinateConfig):CoordinateAxis[]=>config.enabledAxes??(config.axes==='xyz'?['x','y','z']:['x','y']);
export function coordinateName(mode:Mode,id:number,config:CoordinateConfig):string {
  const defaults:Partial<Record<Mode,Record<number,string>>>={hand:{0:'wrist',4:'thumb_tip',8:'index_tip',12:'middle_tip',16:'ring_tip',20:'pinky_tip'},face:{1:'nose_tip',13:'upper_lip',14:'lower_lip'},pose:{15:'left_wrist',16:'right_wrist',23:'left_hip',24:'right_hip'}};
  const pointId=mode==='hand'&&config.handMode==='dual'?id%21:id;
  const base=defaults[mode]?.[pointId]??'point_'+pointId;
  return config.names?.[String(id)]??(mode==='hand'&&config.handMode==='dual'?(id<21?'left_':'right_'):'')+base;
}
export const validCoordinateName=(name:string)=>/^[A-Za-z][A-Za-z0-9_]{0,15}$/.test(name);
export type CoordinatePoint={id:number;x:number;y:number;z?:number};
export type CoordinateFrame={mode:Mode;t:number;points:CoordinatePoint[]};
export const defaultCoordinates=(mode:Mode):CoordinateConfig=>({
  points:[mode==='hand'?8:mode==='face'?1:15],axes:'xy',hz:10,smoothing:.35,named:true
});
export function createCoordinates(mode:Mode,handScope:'single'|'dual'='single'):CoordinateConfig {
 return mode==='hand'?{...defaultCoordinates(mode),handScope,handMode:handScope,...(handScope==='dual'?{points:[8,29]}:{})}:defaultCoordinates(mode);
}
export function lockCoordinateScope(mode:Mode,config:CoordinateConfig):CoordinateConfig {
 if(mode!=='hand')return config;
 const handScope=config.handScope??config.handMode??'single';
 return cleanCoordinateConfig(mode,{...config,handScope,hand:undefined,outputHands:handScope==='dual'&&(config.outputHands==='left'||config.outputHands==='right')?'any':config.outputHands});
}
export const coordinateOutputIds=(config:CoordinateConfig)=>config.handMode!=='dual'||!['left','right'].includes(config.outputHands??'both')?config.points:config.points.filter(id=>Math.floor(id/21)===(config.outputHands==='left'?0:1));
function outputPoints(frame:CoordinateFrame,config:CoordinateConfig){
 const ids=new Set(coordinateOutputIds(config));
 const selected=frame.points.filter(p=>ids.has(p.id));
 const side=config.outputHands==='any'&&config.handMode==='dual'&&selected.length?Math.floor(selected[0].id/21):undefined;
 return side===undefined?selected:selected.filter(p=>Math.floor(p.id/21)===side);
}
export const coordinatePointLimit=(mode:Mode,config:CoordinateConfig)=>mode==='hand'?(config.handMode==='dual'?42:21):4;
// Existing channels keep their names. Only newly selected points may need a
// fallback when a custom name already occupies their normal default.
export function selectCoordinatePoints(mode:Mode,config:CoordinateConfig,points:number[]):CoordinateConfig {
  const names=Object.fromEntries(Object.entries(config.names??{}).filter(([id])=>points.includes(Number(id))));
  const retained=points.filter(id=>config.points.includes(id));
  const used=new Set(retained.map(id=>coordinateName(mode,id,config)));
  for(const id of points.filter(id=>!config.points.includes(id))){
    const name=coordinateName(mode,id,{...config,names});
    if(!used.has(name)){used.add(name);continue;}
    const base=(mode==='hand'&&config.handMode==='dual'?(id<21?'left_':'right_'):'')+'point_'+(mode==='hand'&&config.handMode==='dual'?id%21:id);
    let candidate=base,index=1;
    while(used.has(candidate)){
      const suffix='_'+index++;
      candidate=base.slice(0,16-suffix.length)+suffix;
    }
    names[id]=candidate;used.add(candidate);
  }
  return cleanCoordinateConfig(mode,{...config,points,names:Object.keys(names).length?names:undefined});
}
export function cleanCoordinateConfig(mode:Mode,value:CoordinateConfig):CoordinateConfig {
  if(!value||!Array.isArray(value.points)||value.points.length<1||value.points.length>coordinatePointLimit(mode,value)||
    new Set(value.points).size!==value.points.length||value.points.some(id=>!(mode==='hand'&&value.handMode==='dual'?Number.isInteger(id)&&id>=0&&id<42:validLandmark(mode,id)))||
    !['xy','xyz'].includes(value.axes)||!Number.isInteger(value.hz)||value.hz<1||value.hz>30||
    !Number.isFinite(value.smoothing)||value.smoothing<0||value.smoothing>.9)throw Error('坐标设置无效。');
  if((value.handMode!==undefined&&(!['single','dual'].includes(value.handMode)||mode!=='hand'))||(value.hand!==undefined&&(!['any','left','right'].includes(value.hand)||mode!=='hand'))||(value.handMode==='dual'&&value.named!==true))throw Error('坐标设置无效。');
  if(value.handScope!==undefined&&(mode!=='hand'||!['single','dual'].includes(value.handScope)||value.handScope!==(value.handMode??'single')))throw Error('项目手数与坐标设置不一致。');
  if(value.outputHands!==undefined&&(mode!=='hand'||value.handMode!=='dual'||!['both','any','left','right'].includes(value.outputHands)))throw Error('输出手别设置无效。');
  if(value.named!==undefined&&typeof value.named!=='boolean')throw Error('坐标设置无效。');
  if(value.enabledAxes!==undefined&&(!Array.isArray(value.enabledAxes)||!value.enabledAxes.length||value.enabledAxes.length>3||new Set(value.enabledAxes).size!==value.enabledAxes.length||value.enabledAxes.some(axis=>!['x','y','z'].includes(axis))))throw Error('请至少选择一个坐标轴。');
  if(value.names!==undefined&&(!value.names||typeof value.names!=='object'||Array.isArray(value.names)||Object.entries(value.names).some(([id,name])=>!value.points.includes(Number(id))||String(Number(id))!==id||typeof name!=='string'||!validCoordinateName(name))))throw Error('输出名称需以字母开头，使用最多 16 个字母、数字或下划线。');
  const names=value.points.map(id=>coordinateName(mode,id,value));
  if(new Set(names).size!==names.length)throw Error('各检测点的输出名称需要不同。');
  const handProfiles:CoordinateConfig['handProfiles']={};
  if(value.handProfiles!==undefined){
    if(mode!=='hand'||!value.handProfiles||typeof value.handProfiles!=='object'||Array.isArray(value.handProfiles))throw Error('坐标设置无效。');
    for(const [key,selection] of Object.entries(value.handProfiles)){
      if((key!=='single'&&key!=='dual')||!selection||typeof selection!=='object')throw Error('坐标设置无效。');
      const clean=cleanCoordinateConfig(mode,{...value,...selection,names:selection.names,named:selection.named,handMode:key,handScope:undefined,outputHands:undefined,handProfiles:undefined});
      handProfiles[key]={points:clean.points,named:clean.named,...(clean.names?{names:clean.names}:{})};
    }
  }
  return {...(value.handScope?{handScope:value.handScope}:{}),...(value.outputHands?{outputHands:value.outputHands}:{}),...(value.handProfiles?{handProfiles}:{}),...(value.handMode?{handMode:value.handMode}:{}),...(value.hand?{hand:value.hand}:{}),points:[...value.points],axes:value.axes,hz:value.hz,smoothing:value.smoothing,
    ...(value.named!==undefined?{named:value.named}:{}),...(value.names?{names:{...value.names}}:{}),...(value.enabledAxes?{enabledAxes:[...value.enabledAxes]}:{})};
}
// Keep the two selections independently so toggling never destroys the other setup.
export function switchCoordinateHands(config:CoordinateConfig,handMode:'single'|'dual'):CoordinateConfig {
  if(config.handScope&&config.handScope!==handMode)throw Error('项目手数已固定，请新建另一种手数的项目。');
  const current=config.handMode??'single';
  if(current===handMode)return config;
  const profiles={...config.handProfiles,[current]:{points:[...config.points],named:config.named,...(config.names?{names:{...config.names}}:{})}};
  let selection=profiles[handMode];
  if(!selection){
    if(handMode==='dual'){
      const offset=config.hand==='right'?21:0;
      selection={points:config.points.map(id=>id+offset),named:true};
    }else{
      const preferred=config.hand==='right'?1:0;
      const side=config.points.some(id=>Math.floor(id/21)===preferred)?preferred:1-preferred;
      selection={points:config.points.filter(id=>Math.floor(id/21)===side).map(id=>id%21),named:true};
    }
  }
  return cleanCoordinateConfig('hand',{...config,...selection,names:selection.names,handMode,outputHands:handMode==='dual'?config.outputHands:undefined,handProfiles:profiles});
}
const rounded=(n:number)=>Math.round(n*100000)/100000;
export class CoordinateSampler {
  private previous:CoordinatePoint[]|null=null;
  private hands:(CoordinateSampler|null)[]=[];
  private handSide:HandSide|undefined;
  private choice=new CoordinateHandChoice();
  private time=-Infinity;
  private sent=-Infinity;
  constructor(readonly mode:Mode,readonly config:CoordinateConfig) {
    cleanCoordinateConfig(mode,config);
    if(mode==='hand'&&config.handMode==='dual'){
      this.hands=[0,21].map(offset=>{
        const ids=config.points.filter(id=>id>=offset&&id<offset+21).map(id=>id-offset);
        return ids.length?new CoordinateSampler(mode,{...config,handMode:'single',handScope:undefined,outputHands:undefined,points:ids,names:undefined,handProfiles:undefined}):null;
      });
    }
  }
  reset(keepOutputHand=false){if(!keepOutputHand)this.choice.reset();this.handSide=undefined;this.hands.forEach(s=>s?.reset());this.previous=null;this.time=-Infinity;this.sent=-Infinity;}
  step(points:Point[],now:number):{frame:CoordinateFrame|null;due:boolean} {
    if(!Number.isFinite(now)){this.reset();return {frame:null,due:false};}
    if(now<this.time||now-this.time>350)this.reset(now>=this.time);
    const side=this.mode==='hand'?coordinateHandSide(points):undefined;
    if(side&&this.handSide&&side!==this.handSide)this.reset();
    this.handSide=side;
    if(this.hands.length){
      this.time=now;
      const samples=this.hands.map((s,i)=>({sample:s?.step(points.slice(i*21,i*21+21),now),offset:i*21}));
      const available=samples.map((entry,side)=>({...entry,side})).filter(entry=>!!entry.sample?.frame);
      const choice=this.config.outputHands??'both';
      const active=choice==='any'?this.choice.choose(available.map(entry=>entry.side===0?'left':'right'),now):undefined;
      const selected=available.filter(entry=>choice==='both'||choice==='any'&&(entry.side===0?'left':'right')===active||choice==='left'&&entry.side===0||choice==='right'&&entry.side===1);
      const output=selected.flatMap(({sample,offset})=>sample!.frame!.points.map(p=>({...p,id:p.id+offset})));
      const due=output.length>0&&now-this.sent>=1000/this.config.hz;
      if(due)this.sent=now;
      if(!output.length)this.sent=-Infinity;
      return {frame:output.length?{mode:this.mode,t:Math.round(now),points:output}:null,due};
    }
    const selected=this.config.points.map(id=>points[id]);
    if(!Number.isFinite(now)||selected.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||
      (this.mode==='pose'&&(p.visibility??1)<.45)||
      (coordinateAxes(this.config).includes('z')&&(!Number.isFinite(p.z)||Math.abs(p.z!)>100)))) {
      this.reset();return {frame:null,due:false};
    }
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
  for(const point of outputPoints(frame,config))for(const axis of coordinateAxes(config)) {
    const value=point[axis];
    if(value===undefined||!Number.isFinite(value))throw Error('坐标数据无效。');
    values[coordinateName(frame.mode,point.id,config)+'_'+axis]=value;
  }
  return JSON.stringify({mode:frame.mode,t:frame.t,values});
}
export function coordinateOsc(frame:CoordinateFrame,config?:CoordinateConfig) {
  return (config?outputPoints(frame,config):frame.points).map(point=>config?.named?{
    id:point.id,name:coordinateName(frame.mode,point.id,config),axes:coordinateAxes(config),
    values:coordinateAxes(config).map(axis=>point[axis]!)
  }:{id:point.id,values:point.z===undefined?[point.x,point.y]:[point.x,point.y,point.z]});
}
