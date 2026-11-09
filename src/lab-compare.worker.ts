import {evaluateProject} from './evaluation';
import {validateProject} from './core';
import {LAB_DEFAULTS} from './lab-motion';
self.onmessage=(event:MessageEvent)=>{
 try{const project=validateProject(event.data);const baseline=evaluateProject({...project,lab:undefined});const enhanced=evaluateProject({...project,lab:project.lab??LAB_DEFAULTS});self.postMessage({baseline,enhanced});}
 catch(e){self.postMessage({error:e instanceof Error?e.message:String(e)});}
};
