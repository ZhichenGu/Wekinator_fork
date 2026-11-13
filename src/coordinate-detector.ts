import type {Mode,Point} from './core';

type Detector={detect:(video:HTMLVideoElement,t:number)=>Promise<Point[]>;close:()=>void;fallback:boolean};

// Match the learning workspace: module Workers are preferred, but some browsers
// cannot run MediaPipe's WASM loader there. Keep the same camera stream on fallback.
export async function createCoordinateDetector(mode:Mode,base:string,signal:AbortSignal):Promise<Detector> {
  let worker:Worker|undefined;
  let closed=false;
  let pending:((points:Point[])=>void)|undefined;
  let failed:((reason:Error)=>void)|undefined;
  let cancelInit:(()=>void)|undefined;
  let closeMain:(()=>void)|undefined;
  const abortError=()=>new DOMException('Camera stopped','AbortError');
  const check=()=>{if(signal.aborted||closed)throw abortError();};
  const dispose=()=>{
    closed=true;
    worker?.terminate();worker=undefined;
    cancelInit?.();cancelInit=undefined;
    failed?.(abortError());pending=undefined;failed=undefined;
    closeMain?.();closeMain=undefined;
  };
  const close=()=>{signal.removeEventListener('abort',dispose);dispose();};
  signal.addEventListener('abort',dispose,{once:true});
  try {
    check();
    try {
      worker=new Worker(new URL('./vision.worker.ts',import.meta.url),{type:'module'});
      const candidate=worker;
      await new Promise<void>((resolve,reject)=>{
        const finish=(error?:Error)=>{clearTimeout(timeout);cancelInit=undefined;error?reject(error):resolve();};
        const timeout=setTimeout(()=>finish(new Error('Model initialization timed out')),25000);
        cancelInit=()=>finish(abortError());
        candidate.onerror=()=>finish(new Error('Worker initialization failed'));
        candidate.onmessage=e=>{if(e.data.type==='ready')finish();if(e.data.type==='error')finish(new Error(e.data.message));};
        try {candidate.postMessage({type:'init',mode,base});}catch(e){finish(e instanceof Error?e:new Error(String(e)));}
      });
      check();
      candidate.onerror=()=>{failed?.(new Error('Detection worker failed'));pending=undefined;failed=undefined;};
      candidate.onmessage=e=>{
        if(e.data.type==='result'){pending?.(e.data.points??[]);pending=undefined;failed=undefined;}
        if(e.data.type==='error'){failed?.(new Error(e.data.message));pending=undefined;failed=undefined;}
      };
      return {fallback:false,close,detect:async(video,t)=>{
        check();const image=await createImageBitmap(video);
        if(signal.aborted||closed){image.close();throw abortError();}
        return new Promise<Point[]>((resolve,reject)=>{
          pending=resolve;failed=reject;
          try {candidate.postMessage({type:'frame',image,t},[image]);}
          catch(e){pending=undefined;failed=undefined;image.close();reject(e);}
        });
      }};
    } catch {
      worker?.terminate();worker=undefined;check();
    }
    const mp=await import('@mediapipe/tasks-vision');check();
    const files=await mp.FilesetResolver.forVisionTasks(base+'wasm');check();
    const opts={baseOptions:{modelAssetPath:base+'models/'+mode+'.task',delegate:'CPU' as const},runningMode:'VIDEO' as const};
    let detect:(video:HTMLVideoElement,t:number)=>Point[];
    if(mode==='hand'){
      const d=await mp.HandLandmarker.createFromOptions(files,{...opts,numHands:1,minHandDetectionConfidence:.6,minHandPresenceConfidence:.6});
      closeMain=()=>d.close();detect=(video,t)=>d.detectForVideo(video,t).landmarks[0]??[];
    }else if(mode==='face'){
      const d=await mp.FaceLandmarker.createFromOptions(files,{...opts,numFaces:1,outputFaceBlendshapes:true});
      closeMain=()=>d.close();detect=(video,t)=>d.detectForVideo(video,t).faceLandmarks[0]??[];
    }else{
      const d=await mp.PoseLandmarker.createFromOptions(files,{...opts,numPoses:1});
      closeMain=()=>d.close();detect=(video,t)=>d.detectForVideo(video,t).landmarks[0]??[];
    }
    check();
    return {fallback:true,close,detect:async(video,t)=>{check();return detect(video,t);}};
  }catch(e){close();throw e;}
}
