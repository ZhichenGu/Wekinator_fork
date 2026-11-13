import {labEnabled,buildLabTemplates,labMatch} from './lab-motion';
import {buildTemplates,match,TriggerGate,type Action,type Frame,type Project,type Sample,type Template} from './core';
export type LearningMode='dynamic'|'pose'|'continuous'|'region'|'relation'|'coordinates';
export const learningMode=(p:Project):LearningMode=>p.learning??'dynamic';
export type PosePrototype={actionId:string;vector:number[];negative:boolean};
export function vectorDistance(a:number[],b:number[]):number{
  if(!a.length||a.length!==b.length)return Infinity;
  return Math.sqrt(a.reduce((sum,v,i)=>sum+(v-b[i])**2,0)/a.length);
}
export function medianVector(frames:Frame[]):number[]{
  if(!frames.length)return [];
  const dimension=frames[0].shape.length;
  if(frames.some(f=>f.shape.length!==dimension))return [];
  return Array.from({length:dimension},(_,i)=>{const values=frames.map(f=>f.shape[i]).sort((a,b)=>a-b);const middle=Math.floor(values.length/2);return values.length%2?values[middle]:(values[middle-1]+values[middle])/2;});
}
type PoseQuality={vector:number[];dispersion:number;valid:boolean};
const qualityCache=new WeakMap<Frame[],PoseQuality>();
export function poseQuality(sample:Sample):PoseQuality{
  const cached=qualityCache.get(sample.frames);if(cached)return cached;
  const vector=medianVector(sample.frames);
  const distances=sample.frames.map(f=>vectorDistance(f.shape,vector)).sort((a,b)=>a-b);
  const dispersion=distances[Math.min(distances.length-1,Math.floor(distances.length*.9))]??Infinity;
  const continuous=sample.frames.every((f,i)=>!i||f.t-sample.frames[i-1].t<=220);
  const result={vector,dispersion,valid:sample.frames.length>=5&&!!vector.length&&dispersion<=.18&&continuous};qualityCache.set(sample.frames,result);return result;
}
export function buildPosePrototypes(actions:Action[]):PosePrototype[]{
  const seen=new Set<string>();
  return actions.flatMap(action=>!action.trained?[]:action.samples.filter(s=>s.split!=='test').flatMap(sample=>{
    const q=poseQuality(sample);if(!q.valid)return [];
    const key=JSON.stringify([action.id,sample.negative,q.vector.map(v=>Math.round(v*1e6)/1e6)]);
    if(seen.has(key))return [];seen.add(key);
    return [{actionId:action.id,vector:q.vector,negative:sample.negative}];
  }));
}
export function poseScores(frames:Frame[],prototypes:PosePrototype[]):Record<string,number>{
  const vector=medianVector(frames),scores:Record<string,number>={};
  if(!vector.length)return scores;
  for(const p of prototypes){
    if(p.negative)continue;
    const distance=vectorDistance(vector,p.vector);
    if(prototypes.some(n=>n.negative&&n.actionId===p.actionId&&vectorDistance(vector,n.vector)<distance+.025))continue;
    const score=Math.exp(-3*distance);
    scores[p.actionId]=Math.max(scores[p.actionId]??0,score);
  }
  return scores;
}
export function winningAction(scores:Record<string,number>,actions:Action[]):string|null{
  const ranked=actions.filter(a=>a.trained).map(a=>({id:a.id,threshold:a.threshold,score:scores[a.id]??0})).sort((a,b)=>b.score-a.score);
  const best=ranked[0];
  return best&&Number.isFinite(best.score)&&best.score>=best.threshold&&best.score-(ranked[1]?.score??0)>=.06?best.id:null;
}
export class PoseGate{
  activeId:string|null=null;
  pendingId:string|null=null;
  private since=0;
  private unknownSince:number|null=null;
  private last=-Infinity;
  constructor(private holdMs=350){}
  reset(){this.activeId=null;this.pendingId=null;this.since=0;this.unknownSince=null;this.last=-Infinity;}
  update(scores:Record<string,number>,actions:Action[],now:number):string|null{
    if(now-this.last>220)this.pendingId=null;
    this.last=now;
    const winner=winningAction(scores,actions);
    if(!winner){this.pendingId=null;this.unknownSince??=now;if(now-this.unknownSince>=300)this.activeId=null;return null;}
    this.unknownSince=null;
    if(winner===this.activeId){this.pendingId=winner;return null;}
    if(winner!==this.pendingId){this.pendingId=winner;this.since=now;return null;}
    if(now-this.since>=this.holdMs){this.activeId=winner;return winner;}
    return null;
  }
}
export type RecognitionResult={scores:Record<string,number>;eventId:string|null;state:'waiting'|'locked'|'lost'|'unknown'|'confirming'|'recognized';labelId:string|null;locked:boolean};
/** The exact same recognizer is used for live input and offline held-out clips. */
export class Recognizer{
  readonly templates:Template[];
  readonly prototypes:PosePrototype[];
  readonly mode:LearningMode;
  private buffer:Frame[]=[];
  private dynamicGate=new TriggerGate();
  private poseGate:PoseGate;
  private lastFrame=-Infinity;
  private lastCheck=-Infinity;
  private result:RecognitionResult={scores:{},eventId:null,state:'waiting',labelId:null,locked:false};
  constructor(private project:Project,models?:{templates:Template[];prototypes:PosePrototype[]}){
    this.mode=learningMode(project);
    this.templates=models?.templates??(this.mode==='dynamic'?(labEnabled(project)?buildLabTemplates(project):buildTemplates(project.actions,project.feature)):[]);
    this.prototypes=models?.prototypes??(this.mode==='pose'?buildPosePrototypes(project.actions):[]);
    this.poseGate=new PoseGate((project.poseHoldSeconds??.35)*1000);
  }
  get ready(){return this.mode==='pose'?this.prototypes.some(p=>!p.negative):this.templates.some(t=>!t.negative);}
  step(frame:Frame|null,now:number):RecognitionResult{
    if(!frame){
      if(now-this.lastFrame>220)this.buffer=[];
      if(this.mode==='pose')this.poseGate.update({},this.project.actions,now);else this.dynamicGate.update({},this.project.actions,now);
      return this.result={scores:{},eventId:null,state:'lost',labelId:null,locked:this.mode==='pose'?!!this.poseGate.activeId:this.dynamicGate.locked};
    }
    if(now-this.lastFrame>220){this.buffer=[];this.lastCheck=-Infinity;this.poseGate.update({},this.project.actions,now);}
    this.lastFrame=now;this.buffer.push(frame);this.buffer=this.buffer.filter(f=>now-f.t<=11000);
    if(now-this.lastCheck<100)return {...this.result,eventId:null};
    this.lastCheck=now;
    if(this.mode==='pose'){
      const recent=this.buffer.filter(f=>now-f.t<=250);
      const scores=poseScores(recent,this.prototypes);
      const eventId=this.poseGate.update(scores,this.project.actions,now),labelId=winningAction(scores,this.project.actions);
      return this.result={scores,eventId,labelId,state:!labelId?'unknown':this.poseGate.activeId===labelId?'recognized':'confirming',locked:!!this.poseGate.activeId};
    }
    const scores=labEnabled(this.project)?labMatch(this.buffer,this.templates,this.project):match(this.buffer,this.templates,this.project.feature),eventId=this.dynamicGate.update(scores,this.project.actions,now);
    return this.result={scores,eventId,state:this.dynamicGate.locked?'locked':'waiting',labelId:null,locked:this.dynamicGate.locked};
  }
}
