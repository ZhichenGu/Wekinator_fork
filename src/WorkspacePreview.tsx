import React,{useEffect,useRef,useState} from 'react';
import {ChevronRight,GripHorizontal} from 'lucide-react';
import {t} from './i18n';
import type {Point,Mode} from './core';
import {Skeleton} from './Skeleton';
import {containBox,floatingPreviewVisible,visiblePreviewRatio} from './preview';
export function SettingFold({enabled,title,children}:{enabled:boolean;title:string;children:React.ReactNode}){
 if(!enabled)return <>{children}</>;
 return <details className="pilot-fold" open><summary><span>{t(title)}</span><ChevronRight size={16}/></summary><div>{children}</div></details>;
}
export function FloatingPreview({video,image,stage,points,status,signal,sourceSize,mode,mirrored=true,pinned=false,avoidSettings=false}:{video:React.RefObject<HTMLVideoElement>;image?:React.RefObject<HTMLCanvasElement>;stage:React.RefObject<HTMLDivElement>;pinned?:boolean;avoidSettings?:boolean;points?:Point[];mode?:Mode;mirrored?:boolean;status:string;signal:string;sourceSize:{width:number;height:number}}){
 const [visible,setVisible]=useState(false),[position,setPosition]=useState(()=>({x:avoidSettings?Math.max(8,window.innerWidth-296):20,y:avoidSettings?12:20}));
 const canvas=useRef<HTMLCanvasElement>(null),panel=useRef<HTMLDivElement>(null);
 const drag=useRef<{x:number;y:number;left:number;top:number}|null>(null);
 useEffect(()=>{const target=stage.current;if(!target)return;let scheduled=0;
 const measure=()=>{scheduled=0;const rect=target.getBoundingClientRect();let bottom=window.innerHeight;
 const footer=document.querySelector('.studio-footer')?.getBoundingClientRect();
 if(footer&&footer.top<bottom&&footer.bottom>0)bottom=Math.max(0,footer.top);
 const ratio=visiblePreviewRatio(rect,0,bottom);setVisible(previous=>floatingPreviewVisible(ratio,rect.top,previous));};
 const schedule=()=>{if(!scheduled)scheduled=requestAnimationFrame(measure);};
 const resize=new ResizeObserver(schedule);resize.observe(target);
 document.addEventListener('scroll',schedule,true);window.addEventListener('resize',schedule);measure();
 return()=>{cancelAnimationFrame(scheduled);resize.disconnect();document.removeEventListener('scroll',schedule,true);window.removeEventListener('resize',schedule);};
 },[stage]);
 useEffect(()=>{if(!visible&&!pinned)return;if(!avoidSettings)setPosition(p=>({x:Math.min(p.x,Math.max(8,window.innerWidth-296)),y:Math.max(8,Math.min(p.y===20?window.innerHeight-300:p.y,window.innerHeight-250))}));let id=0;const draw=()=>{const v=video.current,c=canvas.current,source=image?.current??v;if(v&&c&&source&&v.readyState>=2){const w=image?.current?.width??v.videoWidth,h=image?.current?.height??v.videoHeight;if(c.width!==w||c.height!==h){c.width=w;c.height=h;}c.getContext('2d')?.drawImage(source,0,0);}id=requestAnimationFrame(draw);};draw();return()=>cancelAnimationFrame(id);},[visible,pinned,video,image,avoidSettings]);
 const [adjusted,setAdjusted]=useState<{x:number;y:number}|null>(null);
 React.useLayoutEffect(()=>{
   const mini=panel.current;
   if(!avoidSettings||!mini)return;
   const obstacles=[...document.querySelectorAll<HTMLElement>('.hand-settings-trigger,.hand-settings-panel')];
   function place(){
     if(!mini)return;
     const w=mini.offsetWidth,h=mini.offsetHeight;
     const clamp=(n:number,max:number)=>Math.max(8,Math.min(max-8,n));
     const x=clamp(position.x,innerWidth-w),y=clamp(position.y,innerHeight-h);
     const boxes=obstacles.filter(el=>!el.hidden).map(el=>el.getBoundingClientRect());
     const xs=[x,8,innerWidth-w-8,...boxes.flatMap(r=>[r.right+8,r.left-w-8])];
     const ys=[y,8,innerHeight-h-8,...boxes.flatMap(r=>[r.bottom+8,r.top-h-8])];
     const choices=xs.flatMap(left=>ys.map(top=>({x:left,y:top}))).filter(p=>p.x>=0&&p.y>=0&&p.x+w<=innerWidth&&p.y+h<=innerHeight&&boxes.every(r=>p.x+w+4<=r.left||p.x>=r.right+4||p.y+h+4<=r.top||p.y>=r.bottom+4));
     choices.sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));
     // If no free space remains, keep the main camera available and resume the mini on close.
     const next=choices[0]??{x:-w-12,y:0};
     setAdjusted(old=>old?.x===next.x&&old.y===next.y?old:next);
   }
   const observer=new ResizeObserver(place);[mini,...obstacles].forEach(el=>observer.observe(el));
   window.addEventListener('resize',place);document.addEventListener('scroll',place,true);place();
   return ()=>{observer.disconnect();window.removeEventListener('resize',place);document.removeEventListener('scroll',place,true);};
 },[avoidSettings,visible,pinned,position]);
 if(!visible&&!pinned)return null;
 const shown=avoidSettings&&adjusted?adjusted:position;
 const box=containBox(4,3,sourceSize.width,sourceSize.height);
 return <div ref={panel} className="floating-preview" style={{left:shown.x,top:shown.y}} aria-label={t('浮动预览')}><div className="preview-grip" aria-label={t('拖动预览窗口')} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,left:shown.x,top:shown.y};}} onPointerMove={e=>{const d=drag.current;if(d)setPosition({x:Math.max(8,Math.min(window.innerWidth-(panel.current?.offsetWidth??280)-8,d.left+e.clientX-d.x)),y:Math.max(8,Math.min(window.innerHeight-(panel.current?.offsetHeight??240)-8,d.top+e.clientY-d.y))});}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}><span>{t('实时画面')}</span><GripHorizontal size={17}/></div><div className="mini-camera"><div className={"mini-content"+(mirrored?" mirrored":"")} style={{left:box.left/4*100+'%',top:box.top/3*100+'%',width:box.width/4*100+'%',height:box.height/3*100+'%'}}><canvas ref={canvas}/>{mode&&points&&<Skeleton mode={mode} points={points}/>}</div></div><div className="mini-status" role="status"><i className={'signal-light '+signal}/><span>{status}</span></div></div>;
}
