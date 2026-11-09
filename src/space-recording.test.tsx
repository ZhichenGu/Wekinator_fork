import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {recordingShortcut,recordingKeyTarget} from './trim';
import {CameraRecordingKeys} from './CameraRecordingKeys';
import {setLanguage} from './i18n';

test('Space starts and saves, but never saves a countdown or starts while busy',()=>{
 const ready={blocked:false,recording:false,countingDown:false,ready:true,running:false};
 assert.equal(recordingShortcut(' ',ready),'start');
 assert.equal(recordingShortcut(' ',{...ready,recording:true}),'save');
 assert.equal(recordingShortcut(' ',{...ready,recording:true,ready:false}),'save');
 for(const change of [{blocked:true},{running:true},{ready:false},{countingDown:true}])assert.equal(recordingShortcut(' ',{...ready,...change}),null);
 assert.equal(recordingShortcut('Escape',{...ready,recording:true}),'cancel');
 assert.equal(recordingShortcut('Escape',{...ready,countingDown:true}),'cancel');
 assert.equal(recordingShortcut('r',ready),'start');
});

test('Space respects native controls and editable targets; recorder buttons are the exception',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'Element');
 class FakeElement {
  constructor(readonly kind:string){}
  closest(selector:string){
   if(selector==='[data-recording-toggle]')return this.kind==='recorder'?this:null;
   if(selector.startsWith('input,'))return ['input','textarea','select','editable','dialog'].includes(this.kind)?this:null;
   return ['button','link','summary','slider','checkbox','radio','audio','video','recorder'].includes(this.kind)?this:null;
  }
 }
 Object.defineProperty(globalThis,'Element',{value:FakeElement,configurable:true});
 try{
  for(const kind of ['input','textarea','select','editable','dialog','button','link','summary','slider','checkbox','radio','audio','video'])assert.equal(recordingKeyTarget(new FakeElement(kind) as unknown as EventTarget,' '),true,kind);
  assert.equal(recordingKeyTarget(new FakeElement('recorder') as unknown as EventTarget,' '),false);
  assert.equal(recordingKeyTarget(new FakeElement('canvas') as unknown as EventTarget,' '),false);
  assert.equal(recordingKeyTarget(null,' '),false);
 }finally{if(previous)Object.defineProperty(globalThis,'Element',previous);else Reflect.deleteProperty(globalThis,'Element');}
});

test('recording overlay advertises Space for start/save and Esc for cancellation in both languages',()=>{
 for(const lang of ['zh','en'] as const){setLanguage(lang);try{
  for(const recording of [false,true]){
   const html=renderToStaticMarkup(<CameraRecordingKeys recording={recording} preparing={false} disabled={false} onStart={()=>{}} onSave={()=>{}} onCancel={()=>{}}/>);
   assert.ok(html.includes(lang==='zh'?'<kbd>空格</kbd>':'<kbd>Space</kbd>'));
   assert.ok(html.includes(recording?(lang==='zh'?'保存录制':'Save recording'):(lang==='zh'?'开始录制':'Start recording')));
   assert.match(html,/aria-keyshortcuts="Space R"/);assert.match(html,/<kbd>Esc<\/kbd>/);
  }
 }finally{setLanguage('zh');}}
});
