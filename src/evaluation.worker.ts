import {checkContinuous} from './continuous-check';
import {evaluateProject} from './evaluation';
import {validateProject} from './core';
self.onmessage=(event:MessageEvent)=>{
  try{const project=validateProject(event.data.project);const evaluate=project.learning==='continuous'?checkContinuous:evaluateProject;const report=evaluate(project,(done,total)=>self.postMessage({type:'progress',done,total}),event.data.testRound);self.postMessage({type:'complete',report});}
  catch(e){self.postMessage({type:'error',message:e instanceof Error?e.message:String(e)});}
};
