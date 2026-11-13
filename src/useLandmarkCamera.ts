import {useEffect,useRef,useState} from 'react';
import type {Mode,Point} from './core';

export function useLandmarkCamera(mode:Mode,onPoints:(points:Point[])=>void) {
  const video=useRef<HTMLVideoElement>(null);
  const callback=useRef(onPoints);callback.current=onPoints;
  const stream=useRef<MediaStream|null>(null),worker=useRef<Worker|null>(null);
  const epoch=useRef(0),raf=useRef(0),busy=useRef(false),sentAt=useRef(0);
  const [state,setState]=useState<'off'|'opening'|'on'>('off');
  const [error,setError]=useState('');
  const [size,setSize]=useState({width:1280,height:720});
  function stop() {
    epoch.current++;cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;
    worker.current?.terminate();worker.current=null;busy.current=false;
    if(video.current)video.current.srcObject=null;
    setState('off');callback.current([]);
  }
  async function start() {
    stop();setError('');setState('opening');
    const generation=epoch.current;
    try {
      const media=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720}},audio:false});
      if(generation!==epoch.current){media.getTracks().forEach(track=>track.stop());return;}
      stream.current=media;
      media.getTracks().forEach(track=>track.onended=()=>{stop();setError('摄像头连接已中断。');});
      video.current!.srcObject=media;await video.current!.play();
      if(generation!==epoch.current)return;
      setSize({width:video.current!.videoWidth,height:video.current!.videoHeight});
      const detector=new Worker(new URL('./vision.worker.ts',import.meta.url),{type:'module'});
      worker.current=detector;
      detector.onerror=()=>{if(generation===epoch.current){stop();setError('检测模型加载失败，请重新开启摄像头。');}};
      detector.onmessage=event=>{
        if(generation!==epoch.current)return;
        if(event.data.type==='ready'){setState('on');raf.current=requestAnimationFrame(tick);}
        if(event.data.type==='result'){busy.current=false;callback.current(event.data.points??[]);}
        if(event.data.type==='error'){stop();setError('检测模型加载失败，请重新开启摄像头。');}
      };
      async function tick(now:number) {
        if(generation!==epoch.current)return;
        raf.current=requestAnimationFrame(tick);
        if(busy.current){if(now-sentAt.current>1500)callback.current([]);return;}
        if(now-sentAt.current<66||!video.current||video.current.readyState<2)return;
        busy.current=true;sentAt.current=now;
        try {
          const image=await createImageBitmap(video.current);
          if(generation!==epoch.current){image.close();return;}
          detector.postMessage({type:'frame',image,t:now},[image]);
        } catch {if(generation===epoch.current){stop();setError('摄像头连接已中断。');}}
      }
      detector.postMessage({type:'init',mode,base:new URL(import.meta.env.BASE_URL,location.href).href});
    } catch {
      if(generation===epoch.current){stop();setError('无法开启摄像头，请检查设备与权限。');}
    }
  }
  useEffect(()=>{
    const hidden=()=>{if(document.hidden)stop();};
    document.addEventListener('visibilitychange',hidden);window.addEventListener('motion-stop',stop);
    return ()=>{stop();document.removeEventListener('visibilitychange',hidden);window.removeEventListener('motion-stop',stop);};
  },[mode]);
  return {video,state,error,size,start,stop};
}
