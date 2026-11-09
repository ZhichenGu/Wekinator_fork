import {extract,type Project,type Sample} from '../src/core';
import {LAB_DEFAULTS} from '../src/lab-motion';
import {evaluateProject} from '../src/evaluation';
const base=()=>Array.from({length:21},(_,i)=>i===0?{x:.5,y:.75}:{x:.32+Math.floor((i-1)/4)*.075,y:.65-((i-1)%4)*.06});
function sample(kind:number,variant:number,split:'train'|'test',negative=false):Sample{
 const frames=Array.from({length:65},(_,i)=>{const t=i*50,u=Math.max(0,Math.min(1,(t-500)/1700)),points=base();
 if(!negative){const id=[4,8,12,16,20,8][kind];const displacement=.11*Math.sin(u*Math.PI*2)*(1+variant*.025);points[id].x+=displacement;if(kind===5)for(const p of points)p.y+=.06*Math.sin(u*Math.PI*2);}
 const angle=split==='test'?.55:variant*.035,scale=split==='test'?1.1:1,aspect=4/3;
 const transformed=points.map(p=>{const x=(p.x-.5)*aspect,y=p.y-.75;return {x:.5+scale*(x*Math.cos(angle)-y*Math.sin(angle))/aspect,y:.75+scale*(x*Math.sin(angle)+y*Math.cos(angle))};});
 return {...extract('hand',transformed,[],t)!,aspectRatio:aspect};});
 return {id:`${kind}-${variant}-${split}-${negative}`,frames,duration:3200,negative,split,aspectRatio:4/3};
}
const project:Project={schemaVersion:1,name:'Synthetic six-gesture comparison',mode:'hand',learning:'dynamic',feature:'both',updatedAt:'2026-11-09',lab:{...LAB_DEFAULTS},actions:Array.from({length:6},(_,i)=>({id:String(i),name:`Gesture ${i+1}`,effect:'indicator',color:'#dddddd',trained:true,threshold:.8,samples:[...Array.from({length:3},(_,v)=>sample(i,v,'train')),sample(i,7,'test'),...(i===0?[sample(i,8,'test',true)]:[])]}))};
for(const [label,lab] of [['baseline',undefined],['enhanced',LAB_DEFAULTS]] as const){const start=performance.now(),r=evaluateProject({...project,lab});console.log(JSON.stringify({pipeline:label,positiveCorrect:r.positiveCorrect,positiveCount:r.positiveCount,misses:r.misses,confused:r.confused,falseTriggers:r.falseTriggers,negativeCount:r.negativeCount,ms:Math.round(performance.now()-start)}));}
