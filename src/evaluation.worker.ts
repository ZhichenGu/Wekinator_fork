import {evaluateProject} from './evaluation';
import {validateProject} from './core';
self.onmessage=(event:MessageEvent)=>{
  try{const project=validateProject(event.data);const report=evaluateProject(project,(done,total)=>self.postMessage({type:'progress',done,total}));self.postMessage({type:'complete',report});}
  catch(e){self.postMessage({type:'error',message:e instanceof Error?e.message:String(e)});}
};
