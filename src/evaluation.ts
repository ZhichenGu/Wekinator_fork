import {resample,sequence,type Project,type Sample} from './core';
import {learningMode,Recognizer} from './learning';
import {PREVIEW_VERSION} from './release';
export type TrialOutcome='correct'|'miss'|'confused'|'extra'|'rejected'|'falsePositive'|'leakage'|'duplicate'|'invalid';
export type TrialResult={sampleId:string;actionId:string;actionName:string;expectedId:string|null;events:{id:string;name:string;atMs:number}[];outcome:TrialOutcome;reason?:string;durationMs:number};
export type EvaluationReport={version:string;settings:{lab?:Project['lab'];feature:string;poseHoldSeconds:number|null;thresholds:{id:string;name:string;threshold:number;trained:boolean}[]};projectName:string;mode:string;createdAt:string;total:number;evaluated:number;skipped:number;positiveCount:number;positiveCorrect:number;negativeCount:number;negativeCorrect:number;misses:number;confused:number;extra:number;falseTriggers:number;negativeMinutes:number;perAction:{id:string;name:string;tested:number;correct:number}[];confusion:{expected:string;predicted:string;count:number}[];trials:TrialResult[]};
export function sampleSignature(project:Project,sample:Sample):string{
  const seq=learningMode(project)==='pose'?resample(sample.frames,60).map(f=>f.shape):sequence(sample.frames,project.feature);
  return JSON.stringify(seq.map(vector=>vector.map(v=>Math.round(v*1e6)/1e6)));
}
export function evaluateProject(project:Project,onProgress?:(done:number,total:number)=>void):EvaluationReport{
 if(project.learning==='continuous')throw new Error('连续控制不使用分类式测试报告。');
  const names=new Map(project.actions.map(a=>[a.id,a.name]));
  const samples=project.actions.flatMap(a=>a.samples.filter(s=>s.split==='test').map(sample=>({action:a,sample})));
  if(!samples.length)throw new Error('还没有独立测试录制。请选择“独立测试”，重新录制后再检查。');
  const model=new Recognizer(project);
  if(!model.ready)throw new Error('请先训练至少一个可用的动作或姿态。');
  const trainSignatures=new Set(project.actions.flatMap(a=>a.samples.filter(s=>s.split!=='test').map(s=>sampleSignature(project,s))));
  const seen=new Set<string>();const trials:TrialResult[]=[];
  samples.forEach(({action,sample},index)=>{
    const signature=sampleSignature(project,sample);
    const trial:TrialResult={sampleId:sample.id,actionId:action.id,actionName:action.name,expectedId:sample.negative?null:action.id,events:[],outcome:'invalid',durationMs:sample.duration};
    if(trainSignatures.has(signature)){trial.outcome='leakage';trial.reason='与训练数据重复，请重新录制独立测试。';}
    else if(seen.has(signature)){trial.outcome='duplicate';trial.reason='与另一条测试录制重复，不重复计入。';}
    else if(sample.frames.length<5||!sample.duration){trial.reason='测试数据不完整。';}
    else{
      seen.add(signature);const recognizer=new Recognizer(project,model),start=sample.frames[0].t;
      for(const f of sample.frames){const result=recognizer.step(f,f.t);if(result.eventId)trial.events.push({id:result.eventId,name:names.get(result.eventId)??result.eventId,atMs:f.t-start});}
      if(sample.negative)trial.outcome=trial.events.length?'falsePositive':'rejected';
      else if(!trial.events.length)trial.outcome='miss';
      else if(trial.events.some(e=>e.id!==action.id))trial.outcome='confused';
      else trial.outcome=trial.events.length===1?'correct':'extra';
    }
    trials.push(trial);onProgress?.(index+1,samples.length);
  });
  const valid=trials.filter(t=>!['leakage','duplicate','invalid'].includes(t.outcome));
  const positives=valid.filter(t=>t.expectedId!==null),negatives=valid.filter(t=>t.expectedId===null);
  const matrix=new Map<string,{expected:string;predicted:string;count:number}>();
  for(const t of valid){const expected=t.expectedId?names.get(t.expectedId)??t.expectedId:'不应触发',predicted=t.events[0]?.name??'无触发';const key=JSON.stringify([expected,predicted]);const entry=matrix.get(key)??{expected,predicted,count:0};entry.count++;matrix.set(key,entry);}
  return {version:PREVIEW_VERSION,settings:{lab:project.lab,feature:project.feature,poseHoldSeconds:learningMode(project)==='pose'?(project.poseHoldSeconds??.35):null,thresholds:project.actions.map(a=>({id:a.id,name:a.name,threshold:a.threshold,trained:a.trained}))},projectName:project.name,mode:learningMode(project),createdAt:new Date().toISOString(),total:samples.length,evaluated:valid.length,skipped:trials.length-valid.length,positiveCount:positives.length,positiveCorrect:positives.filter(t=>t.outcome==='correct').length,negativeCount:negatives.length,negativeCorrect:negatives.filter(t=>t.outcome==='rejected').length,misses:valid.filter(t=>t.outcome==='miss').length,confused:valid.filter(t=>t.outcome==='confused').length,extra:valid.filter(t=>t.outcome==='extra').length,falseTriggers:negatives.reduce((n,t)=>n+t.events.length,0),negativeMinutes:negatives.reduce((n,t)=>n+t.durationMs,0)/60000,perAction:project.actions.map(a=>({id:a.id,name:a.name,tested:positives.filter(t=>t.expectedId===a.id).length,correct:positives.filter(t=>t.expectedId===a.id&&t.outcome==='correct').length})),confusion:[...matrix.values()],trials};
}
