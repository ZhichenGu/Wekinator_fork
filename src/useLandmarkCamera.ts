import {useEffect,useRef,useState} from 'react';
import type {CoordinateHandOptions} from './coordinate-hands';
import type {Mode,Point} from './core';
import {createCoordinateDetector} from './coordinate-detector';

export function useLandmarkCamera(mode:Mode,onPoints:(points:Point[])=>void,handOptions?:CoordinateHandOptions) {
  const options=useRef(handOptions);options.current=handOptions;
  const video=useRef<HTMLVideoElement>(null);
  const callback=useRef(onPoints);callback.current=onPoints;
  const stream=useRef<MediaStream|null>(null);
  const controller=useRef<AbortController|null>(null);
  const detector=useRef<Awaited<ReturnType<typeof createCoordinateDetector>>|null>(null);
  const epoch=useRef(0),raf=useRef(0),busy=useRef(false),sentAt=useRef(0);
  const videoTime=useRef(-1),freshAt=useRef(0);
  const [state,setState]=useState<'off'|'opening'|'on'>('off');
  const [error,setError]=useState('');
  const [fallback,setFallback]=useState(false);
  const [size,setSize]=useState({width:1280,height:720});
  function stop() {
    epoch.current++;cancelAnimationFrame(raf.current);
    controller.current?.abort();controller.current=null;
    detector.current?.close();detector.current=null;
    stream.current?.getTracks().forEach(track=>{track.onended=null;track.stop();});stream.current=null;
    busy.current=false;sentAt.current=0;videoTime.current=-1;freshAt.current=0;
    if(video.current)video.current.srcObject=null;
    setState('off');setFallback(false);callback.current([]);
  }
  async function start() {
    stop();setError('');setState('opening');
    const generation=epoch.current;
    let phase:'camera'|'model'='camera';
    try {
      const media=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720},aspectRatio:{ideal:16/9},facingMode:'user'},audio:false});
      if(generation!==epoch.current){media.getTracks().forEach(track=>track.stop());return;}
      stream.current=media;
      media.getTracks().forEach(track=>track.onended=()=>{if(generation===epoch.current){stop();setError('摄像头连接已中断。');}});
      const element=video.current!;element.srcObject=media;await element.play();
      if(generation!==epoch.current)return;
      setSize({width:element.videoWidth||1280,height:element.videoHeight||720});
      phase='model';
      const abort=new AbortController();controller.current=abort;
      const active=await createCoordinateDetector(mode,new URL(import.meta.env.BASE_URL,location.href).href,abort.signal,handOptions);
      if(generation!==epoch.current){active.close();return;}
      detector.current=active;setFallback(active.fallback);setState('on');
      async function tick(now:number) {
        if(generation!==epoch.current)return;
        raf.current=requestAnimationFrame(tick);
        if(busy.current){if(now-sentAt.current>350)callback.current([]);return;}
        if(now-sentAt.current<66||!video.current||video.current.readyState<2)return;
        if(video.current.currentTime===videoTime.current){
          if(now-freshAt.current>350)callback.current([]);
          return;
        }
        videoTime.current=video.current.currentTime;freshAt.current=now;
        const requested={handMode:options.current?.handMode,hand:options.current?.hand};
        busy.current=true;sentAt.current=now;
        try {
          const points=await active.detect(video.current,now,requested);
          if(generation===epoch.current){
            const changed=requested.handMode!==options.current?.handMode||requested.hand!==options.current?.hand;
            callback.current(changed||performance.now()-now>350?[]:points);
          }
        } catch {
          if(generation===epoch.current){stop();setError('检测模型加载失败，请重新开启摄像头。');}
        } finally {if(generation===epoch.current)busy.current=false;}
      }
      raf.current=requestAnimationFrame(tick);
    } catch {
      if(generation===epoch.current){stop();setError(phase==='model'?'检测模型加载失败，请重新开启摄像头。':'无法开启摄像头，请检查设备与权限。');}
    }
  }
  useEffect(()=>{
    const hidden=()=>{if(document.hidden)stop();};
    document.addEventListener('visibilitychange',hidden);window.addEventListener('motion-stop',stop);
    return ()=>{stop();document.removeEventListener('visibilitychange',hidden);window.removeEventListener('motion-stop',stop);};
  },[mode]);
  return {video,state,error,size,start,stop,fallback,clearError:()=>setError('')};
}
