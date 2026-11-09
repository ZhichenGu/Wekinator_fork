import React from 'react';import test from 'node:test';import assert from 'node:assert/strict';import {renderToStaticMarkup} from 'react-dom/server';
import {FocusControls} from './FocusControls';import {PointPicker} from './PointPicker';import {focusPresets,focusedFrame,changeFocus,recommendedPoints} from './focus';import {extract,validateProject,type Project} from './core';
import {ObjectStudio} from './ObjectStudio';import {newObjectProject} from './objects';import {AudioStudio} from './AudioStudio';import {newAudioProject} from './audio';import {setLanguage} from './i18n';
test('face presets and dense focus preserve all source points through save and restore',()=>{
 assert.equal(recommendedPoints('face').length,12);assert.deepEqual(focusPresets('face').map(p=>p.name),['嘴部','眼睑','眉部']);
 const pts=Array.from({length:478},(_,i)=>({x:.2+(i%30)*.01,y:.2+(i%20)*.01}));const base=extract('face',pts,[.2,.8],0)!;
 const project:Project={schemaVersion:1,name:'Dense',mode:'face',feature:'shape',updatedAt:'',actions:[{id:'a',name:'a',effect:'indicator',color:'#ddddee',threshold:.7,trained:true,samples:[{id:'s',duration:1000,negative:false,frames:Array.from({length:21},(_,i)=>({...base,t:i*50}))}]}]};
 const dense=changeFocus(project,Array.from({length:478},(_,i)=>i));assert.equal(dense.actions[0].samples[0].frames[0].shape.length,956);assert.equal(dense.actions[0].trained,false);assert.deepEqual(validateProject(JSON.parse(JSON.stringify(dense))).focus,dense.focus);
 for(const preset of focusPresets('face'))assert.ok(focusedFrame('face',pts,preset.ids,0));
 const html=renderToStaticMarkup(<FocusControls mode="face" onChange={()=>{}} disabled={false}/>);assert.match(html,/全部面部点（高级）/);
});
test('dense face view draws every landmark without covering the image in numbers',()=>{
 const pts=Array.from({length:478},(_,i)=>({x:.2+(i%30)*.01,y:.2+(i%20)*.01}));
 const dense=renderToStaticMarkup(<PointPicker mode="face" points={pts} selected={Array.from({length:478},(_,i)=>i)} onSelect={()=>{}} compact dense pair={false}/>);
 assert.equal((dense.match(/<circle/g)||[]).length,478);assert.equal((dense.match(/class="dense-point-label"/g)||[]).length,478);
 const simple=renderToStaticMarkup(<PointPicker mode="face" points={pts} selected={recommendedPoints('face')} onSelect={()=>{}} compact pair={false}/>);assert.equal((simple.match(/<circle/g)||[]).length,12);
});
test('visual target precedes collapsed API settings and each audio task has the appropriate input controls',()=>{
 for(const language of ['zh','en'] as const){setLanguage(language);try{
 const visual=renderToStaticMarkup(<ObjectStudio initial={newObjectProject('Visual')} onBack={()=>{}} onSaved={()=>{}}/>);
 assert.ok(visual.indexOf('id="object-target-settings"')<visual.indexOf('id="object-api-settings"'));assert.match(visual,/<div id="object-api-settings" hidden=""/);assert.ok(visual.includes(language==='en'?'Draw detection region':'画检测区域'));assert.ok(visual.includes(language==='en'?'Consecutive confirmations':'连续确认'));
 const event=renderToStaticMarkup(<AudioStudio initial={newAudioProject('Sound','event')} onBack={()=>{}} onSaved={()=>{}}/>);assert.match(event,/class="audio-monitor"/);assert.match(event,/class="audio-comparison"/);assert.match(event,/<div id="audio-api-settings" hidden=""/);assert.ok(event.includes(language==='en'?'Reference sample':'参考样例'));assert.ok(event.includes(language==='en'?'Test recording':'待测录音'));
 const volume=renderToStaticMarkup(<AudioStudio initial={newAudioProject('Volume','volume')} onBack={()=>{}} onSaved={()=>{}}/>);assert.ok(!volume.includes('id="audio-api-settings"'));assert.ok(volume.includes(language==='en'?'Raw input RMS':'原始输入 RMS'));assert.ok(volume.includes(language==='en'?'Mapped output':'映射后输出'));
 }finally{setLanguage('zh');}}
});
