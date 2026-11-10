import type {Action,Sample} from './core';import {recordingQuality} from './recording';
export function trimSample(sample:Sample,startMs:number,endMs:number):Sample{
 if(!Number.isFinite(startMs)||!Number.isFinite(endMs)||startMs<0||endMs>sample.duration+.01||endMs<=startMs)throw new Error('请设置有效的裁剪起点和终点。');
 const frames=sample.frames.filter(f=>f.t>=startMs&&f.t<=endMs);const quality=recordingQuality(frames,endMs-startMs);if(!quality.valid)throw new Error(quality.message);
 const first=frames[0].t;
 const offset=sample.frames.indexOf(frames[0]);
 const lostBefore=sample.lostBefore?.filter(i=>(i>offset||(i===0&&startMs===0))&&(i<offset+frames.length||(i===sample.frames.length&&endMs===sample.duration))).map(i=>i-offset);
 return {...sample,lostBefore,frames:frames.map(f=>({...f,t:f.t-first})),duration:quality.duration};
}
export function editableKeyTarget(target:EventTarget|null){return typeof Element!=='undefined'&&target instanceof Element&&!!target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),dialog');}

// Space keeps native behavior on other controls; recording buttons share the global toggle.
export function recordingKeyTarget(target:EventTarget|null,key:string){
 if(editableKeyTarget(target))return true;
 return key===' '&&typeof Element!=='undefined'&&target instanceof Element&&!!target.closest('button,a,summary,[role="button"],[role="slider"],[role="checkbox"],[role="radio"],audio,video')&&!target.closest('[data-recording-toggle]');
}

export function trimActionSample(action:Action,trimmed:Sample):Action{const previous=action.samples.find(s=>s.id===trimmed.id);if(!previous)throw new Error('录制不存在。');return {...action,trained:previous.split==='test'?action.trained:false,samples:action.samples.map(s=>s.id===trimmed.id?trimmed:s)};}

export function recordingShortcut(key:string,state:{blocked:boolean;recording:boolean;countingDown:boolean;ready:boolean;running:boolean}):'start'|'save'|'cancel'|null{
 if(state.blocked)return null;
 if(key==='Escape'&&(state.recording||state.countingDown))return 'cancel';
 if((key!==' '&&key.toLowerCase()!=='r')||state.running)return null;
 return state.recording?'save':!state.countingDown&&state.ready?'start':null;
}
