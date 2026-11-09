import React,{useEffect,useRef,useState} from 'react';
import {ChevronRight,GripHorizontal} from 'lucide-react';
import {t} from './i18n';
import type {Point,Mode} from './core';
import {Skeleton} from './Skeleton';
import {containBox,floatingPreviewVisible} from './preview';
export function SettingFold({enabled,title,children}:{enabled:boolean;title:string;children:React.ReactNode}){
 if(!enabled)return <>{children}</>;
 return <details className="pilot-fold" open><summary><span>{t(title)}</span><ChevronRight size={16}/></summary><div>{children}</div></details>;
}
export function FloatingPreview({video,stage,points,status,signal,sourceSize,mode,mirrored=true}:{video:React.RefObject<HTMLVideoElement>;stage:React.RefObject<HTMLDivElement>;points?:Point[];mode?:Mode;mirrored?:boolean;status:string;signal:string;sourceSize:{width:number;height:number}}){
 const [visible,setVisible]=useState(false),[position,setPosition]=useState({x:20,y:20});
 const canvas=useRef<HTMLCanvasElement>(null),panel=useRef<HTMLDivElement>(null);
 const drag=useRef<{x:number;y:number;left:number;top:number}|null>(null);
 useEffect(()=>{const target=stage.current;if(!target)return;const observer=new IntersectionObserver(([entry])=>setVisible(previous=>floatingPreviewVisible(entry.intersectionRatio,entry.boundingClientRect.top,previous)),{threshold:[0,.35,.5,1]});observer.observe(target);return()=>observer.disconnect();},[stage]);
 useEffect(()=>{if(!visible)return;setPosition(p=>({x:Math.min(p.x,Math.max(8,window.innerWidth-296)),y:Math.max(8,Math.min(p.y===20?window.innerHeight-300:p.y,window.innerHeight-250))}));let id=0;const draw=()=>{const v=video.current,c=canvas.current;if(v&&c&&v.readyState>=2){if(c.width!==v.videoWidth||c.height!==v.videoHeight){c.width=v.videoWidth;c.height=v.videoHeight;}c.getContext('2d')?.drawImage(v,0,0);}id=requestAnimationFrame(draw);};draw();return()=>cancelAnimationFrame(id);},[visible,video]);
 if(!visible)return null;
 const box=containBox(4,3,sourceSize.width,sourceSize.height);
 return <div ref={panel} className="floating-preview" style={{left:position.x,top:position.y}} aria-label={t('浮动预览')}><div className="preview-grip" aria-label={t('拖动预览窗口')} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,left:position.x,top:position.y};}} onPointerMove={e=>{const d=drag.current;if(d)setPosition({x:Math.max(8,Math.min(window.innerWidth-(panel.current?.offsetWidth??280)-8,d.left+e.clientX-d.x)),y:Math.max(8,Math.min(window.innerHeight-(panel.current?.offsetHeight??240)-8,d.top+e.clientY-d.y))});}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}><span>{t('实时画面')}</span><GripHorizontal size={17}/></div><div className="mini-camera"><div className={"mini-content"+(mirrored?" mirrored":"")} style={{left:box.left/4*100+'%',top:box.top/3*100+'%',width:box.width/4*100+'%',height:box.height/3*100+'%'}}><canvas ref={canvas}/>{mode&&points&&<Skeleton mode={mode} points={points}/>}</div></div><div className="mini-status" role="status"><i className={'signal-light '+signal}/><span>{status}</span></div></div>;
}
