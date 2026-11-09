import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {SettingFold} from './WorkspacePreview';
import {ActionItem} from './ActionItem';
import {PointPicker} from './PointPicker';
import {setLanguage} from './i18n';
import type {Action} from './core';

test('foldable settings begin expanded and retain native keyboard controls',()=>{
 const html=renderToStaticMarkup(<SettingFold enabled title="学习方式"><input aria-label="threshold" defaultValue="0.8"/></SettingFold>);
 assert.match(html,/<details[^>]*open=""/);assert.match(html,/<summary>/);assert.match(html,/aria-label="threshold"/);
 const plain=renderToStaticMarkup(<SettingFold enabled={false} title="学习方式"><span>settings</span></SettingFold>);
 assert.equal(plain,'<span>settings</span>');
});
test('action name and rename are separate accessible buttons and disable during recording',()=>{
 const action:Action={id:'a',name:'Wave',effect:'indicator',color:'#ddd',samples:[],trained:false,threshold:.8};
 for(const disabled of [false,true]){
 const html=renderToStaticMarkup(<ActionItem action={action} index={0} selected disabled={disabled} renameDisabled={false} onSelect={()=>{}} onRename={()=>{}}/>);
 assert.equal((html.match(/<button/g)??[]).length,2);assert.match(html,/aria-label="重命名动作 Wave"/);
 assert.equal((html.match(/disabled=""/g)??[]).length,disabled?2:0);assert.doesNotMatch(html,/<button[^>]*>(?:(?!<\/button>)[\s\S])*<button/);
 }
});
test('all three camera landmark types retain numbered keyboard selection in compact mode',()=>{
 for(const [mode,count,selected] of [['hand',21,[8]],['face',478,[13]],['pose',33,[15]]] as const){
 const points=Array.from({length:count},()=>({x:.4,y:.4,visibility:1}));
 const html=renderToStaticMarkup(<PointPicker mode={mode} points={points} selected={[...selected]} compact onSelect={()=>{}}/>);
 assert.match(html,/fill="#dc3545"/);assert.match(html,/r="7"/);assert.match(html,/tabindex="0"/);assert.match(html,new RegExp('data-landmark-label="'+selected[0]+'"'));
 }
});
test('rename hint follows language without translating the user action name',()=>{
 const action:Action={id:'a',name:'我的 Wave',effect:'indicator',color:'#ddd',samples:[],trained:false,threshold:.8};
 setLanguage('en');try{const html=renderToStaticMarkup(<ActionItem action={action} index={0} selected disabled={false} renameDisabled={false} onSelect={()=>{}} onRename={()=>{}}/>);assert.match(html,/Rename action 我的 Wave/);assert.match(html,/>我的 Wave<\/strong>/);}finally{setLanguage('zh');}
});

test('MQTT downloads match trigger versus continuous outputs',async()=>{
 const {MqttPanel}=await import('./MqttPanel');
 const output={state:'idle' as const,message:'',password:'',sending:false,setPassword:()=>{},disconnect:()=>{},reset:()=>{},connect:async()=>{},send:async()=>{}};
 for(const continuous of [false,true]){
 const html=renderToStaticMarkup(<MqttPanel continuous={continuous} output={output} actionId="a" disabled={false} onSave={()=>{}} onTest={()=>{}} onDirtyChange={()=>{}}/>);
 assert.match(html,new RegExp(continuous?'esp32s3_mqtt_numeric.ino':'esp32s3_mqtt_led.ino'));
 assert.ok(html.includes(continuous?'value="{value}"':'value="YES"'));
 }
});
