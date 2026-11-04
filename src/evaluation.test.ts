import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evaluateProject} from './evaluation';
import {buildTemplates,type Action,type Frame,type Project,type Sample} from './core';
function frames(value:number,noise:number):Frame[]{return Array.from({length:31},(_,i)=>({t:i*50,points:[],shape:[value+Math.sin(i)*noise,value+Math.cos(i)*noise],root:[.3,.4],scale:.1}));}
function sample(id:string,value:number,noise:number,split:'train'|'test',negative=false):Sample{return {id,frames:frames(value,noise),duration:1500,negative,split};}
const action=(id:string,value:number):Action=>({id,name:id,effect:'serial',serial:{text:'YES',lineEnding:'lf'},color:'#dddddd',threshold:.8,trained:true,samples:[sample('train-'+id,value,.005,'train')]});
test('held-out evaluation counts correct poses, unknown rejection, missed classes and confusion without mutating project data',()=>{
  const a=action('a',0),b=action('b',1),independent=sample('a-correct',.02,.008,'test');
  a.samples.push(independent,sample('a-confused',1.03,.009,'test'),sample('a-miss',3.02,.006,'test'),sample('negative',3,.008,'test',true),{...a.samples[0],id:'copied-train',split:'test'},{...independent,id:'copied-test'});
  b.samples.push(sample('b-correct',1.02,.007,'test'));
  const project:Project={schemaVersion:1,name:'合成验证',mode:'hand',feature:'shape',learning:'pose',actions:[a,b],updatedAt:''};const before=JSON.stringify(project);
  const progress:number[]=[];const result=evaluateProject(project,n=>progress.push(n));
  assert.equal(result.total,7);assert.equal(result.evaluated,5);assert.equal(result.skipped,2);
  assert.equal(result.positiveCount,4);assert.equal(result.positiveCorrect,2);assert.equal(result.negativeCorrect,1);assert.equal(result.misses,1);assert.equal(result.confused,1);
  assert.equal(result.trials.filter(t=>t.outcome==='leakage').length,1);assert.equal(result.trials.filter(t=>t.outcome==='duplicate').length,1);
  assert.equal(progress.at(-1),7);assert.equal(JSON.stringify(project),before);
});
test('unseen negative clips count actual false trigger events rather than an invented accuracy',()=>{
  const a=action('a',0);a.samples.push(sample('false-trigger',.025,.008,'test',true));
  const result=evaluateProject({schemaVersion:1,name:'负例',mode:'hand',feature:'shape',learning:'pose',actions:[a],updatedAt:''});
  assert.equal(result.positiveCount,0);assert.equal(result.negativeCount,1);assert.equal(result.negativeCorrect,0);assert.equal(result.falseTriggers,1);
});
test('all duplicated held-out data produces no valid denominator',()=>{
  const a=action('a',0);a.samples.push({...a.samples[0],id:'copy',split:'test'});
  const result=evaluateProject({schemaVersion:1,name:'重复',mode:'hand',feature:'shape',learning:'pose',actions:[a],updatedAt:''});
  assert.equal(result.evaluated,0);assert.equal(result.positiveCount,0);assert.equal(result.skipped,1);
});
test('dynamic templates cannot learn a clip marked as held out',()=>{
  const a=action('a',0);a.samples=[{...sample('test-only',0,.1,'test'),frames:Array.from({length:61},(_,i)=>({t:i*50,points:[],shape:[i/60],root:[i/300,.4] as [number,number],scale:.1})),duration:3000}];
  assert.equal(buildTemplates([a],'both').length,0);
});

test('held-out dynamic action and partial-motion negative use the same streaming recognizer as live input',()=>{
  function moving(id:string,duration:number,noise:number,split:'train'|'test',negative=false,partial=false):Sample{
    const fs=Array.from({length:61},(_,i)=>{const u=i/60*(partial?.5:1);return {t:i*duration/60,points:[],shape:[Math.sin(u*Math.PI)+noise,u],root:[u*.2,.4] as [number,number],scale:.1};});
    return {id,frames:fs,duration,split,negative};
  }
  const a=action('a',0);a.samples=[moving('motion-train',3000,0,'train'),moving('motion-test',3600,.01,'test'),moving('partial-test',1500,.02,'test',true,true)];
  const result=evaluateProject({schemaVersion:1,name:'动态独立验证',mode:'hand',feature:'both',learning:'dynamic',actions:[a],updatedAt:''});
  assert.equal(result.positiveCorrect,1);assert.equal(result.negativeCorrect,1);assert.equal(result.falseTriggers,0);
});
