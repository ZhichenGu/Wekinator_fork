import type {Project, Sample} from './core';
import {buildAnchors, ContinuousController} from './continuous';
import {sampleSignature} from './evaluation';

export type ValueTrial = {
  actionId:string; sampleId:string; target?:number; round?:number;
  total:number; valid:number; median:number|null; error:number|null; spread:number|null;
  excluded?:'missingTarget'|'trainingCopy'|'testCopy';
};
export type ValueReport = {projectName:string; testRound?:number; trials:ValueTrial[]};

function quantile(sorted:number[], fraction:number) {
  const index=(sorted.length-1)*fraction, lower=Math.floor(index);
  return sorted[lower]+(sorted[Math.ceil(index)]-sorted[lower])*(index-lower);
}

export function checkContinuous(project:Project, progress?:(done:number,total:number)=>void, testRound?:number):ValueReport {
  const anchors=buildAnchors(project.actions,project);
  const training=new Set<string>(), seen=new Set<string>();
  const tests:{actionId:string; sample:Sample}[]=[];
  for (const action of project.actions) {
    for (const sample of action.samples) {
      if(sample.split!=='test') training.add(sampleSignature(project,sample));
      else if(testRound===undefined||sample.testRound===testRound) tests.push({actionId:action.id,sample});
    }
  }
  const trials=tests.map(({actionId,sample},i)=>{
    const key=sampleSignature(project,sample), lost=sample.lostBefore??[];
    const trial:ValueTrial={actionId,sampleId:sample.id,target:sample.testValue,round:sample.testRound,
      total:sample.frames.length+lost.length,valid:0,median:null,error:null,spread:null};
    if(sample.testValue===undefined) trial.excluded='missingTarget';
    else if(training.has(key)) trial.excluded='trainingCopy';
    else if(seen.has(key)) trial.excluded='testCopy';
    else {
      seen.add(key);
      const controller=new ContinuousController(anchors), values:number[]=[];
      const resets=new Set(lost);
      sample.frames.forEach((frame,index)=>{
        if(resets.has(index)) controller.step(null,frame.t);
        const {value}=controller.step(frame,frame.t);
        if(value!==null) values.push(value);
      });
      values.sort((a,b)=>a-b);
      trial.valid=values.length;
      if(values.length) {
        trial.median=quantile(values,.5);
        trial.error=Math.abs(trial.median-sample.testValue);
        trial.spread=quantile(values,.9)-quantile(values,.1);
      }
    }
    progress?.(i+1,tests.length);
    return trial;
  });
  return {projectName:project.name,testRound,trials};
}
