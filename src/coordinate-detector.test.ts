import test from 'node:test';
import assert from 'node:assert/strict';
import {createCoordinateDetector} from './coordinate-detector';

test('coordinate detector releases a worker immediately when stopped during initialization',async()=>{
  const original=globalThis.Worker;
  let terminated=0;
  class WaitingWorker {
    onmessage:unknown;onerror:unknown;
    postMessage(){}
    terminate(){terminated++;}
  }
  globalThis.Worker=WaitingWorker as unknown as typeof Worker;
  try {
    const abort=new AbortController();
    const opening=createCoordinateDetector('hand','http://localhost/',abort.signal);
    abort.abort();
    await assert.rejects(opening,{name:'AbortError'});
    assert.equal(terminated,1);
  }finally{globalThis.Worker=original;}
});

test('coordinate detector retains raw partial points and closes an image that finishes after stopping',async()=>{
  const originalWorker=globalThis.Worker,originalBitmap=globalThis.createImageBitmap;
  let terminated=0,closed=0,finishBitmap:((value:ImageBitmap)=>void)|undefined;
  const points=[{x:.2,y:.4,z:0,visibility:.8}];
  class ReadyWorker {
    onmessage:((e:{data:unknown})=>void)|undefined;onerror:unknown;
    postMessage(data:{type:string}){queueMicrotask(()=>this.onmessage?.({data:data.type==='init'?{type:'ready'}:{type:'result',frame:null,points}}));}
    terminate(){terminated++;}
  }
  globalThis.Worker=ReadyWorker as unknown as typeof Worker;
  globalThis.createImageBitmap=(()=>Promise.resolve({width:640,height:360,close(){closed++;}})) as typeof createImageBitmap;
  try {
    const abort=new AbortController();
    const d=await createCoordinateDetector('pose','http://localhost/',abort.signal);
    assert.equal(d.fallback,false);
    assert.deepEqual(await d.detect({} as HTMLVideoElement,1),points);
    globalThis.createImageBitmap=(()=>new Promise<ImageBitmap>(resolve=>{finishBitmap=resolve;})) as typeof createImageBitmap;
    const inFlight=d.detect({} as HTMLVideoElement,2);
    abort.abort();d.close();
    finishBitmap!({close(){closed++;}} as ImageBitmap);
    await assert.rejects(inFlight,{name:'AbortError'});
    assert.equal(terminated,1);
    assert.equal(closed,1);
    await assert.rejects(d.detect({} as HTMLVideoElement,3),{name:'AbortError'});
  }finally{globalThis.Worker=originalWorker;globalThis.createImageBitmap=originalBitmap;}
});
