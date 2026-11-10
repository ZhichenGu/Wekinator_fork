import {Recognizer} from './learning';
import {scoreRecording,type TrialResult} from './evaluation';
import type {Project} from './core';
self.onmessage=({data}:{data:{project:Project;actionId:string}})=>{
  const {project,actionId}=data;
  const action=project.actions.find(a=>a.id===actionId);
  if(!action?.trained)return;
  const model=new Recognizer(project);
  if(!model.ready)return;
  const names=new Map(project.actions.map(a=>[a.id,a.name]));
  const results:TrialResult[]=[];
  for(const sample of action.samples){
    if(sample.split==='test')continue;
    const trial:TrialResult={actionId,actionName:action.name,sampleId:sample.id,expectedId:sample.negative?null:actionId,durationMs:sample.duration,events:[],outcome:'invalid'};
    scoreRecording(project,model,sample,trial,names);
    if(trial.outcome!=='correct'&&trial.outcome!=='rejected')results.push(trial);
  }
  self.postMessage(results);
};
