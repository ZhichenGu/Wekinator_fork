import React,{useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {Mode} from './core';
import type {LearningMode} from './learning';
import {methodHelp} from './method-help';
import {t} from './i18n';
export function MethodChoice({mode,method,help,provider,title,subtitle,selected,onSelect,disabled=false,labels=['判断什么','如何设置','输出什么']}:{disabled?:boolean;labels?:readonly string[];mode?:Mode;method?:LearningMode;help?:readonly string[];provider?:string;title:string;subtitle?:string;selected:boolean;onSelect:()=>void}) {
 const rows=help??(mode&&method?methodHelp[mode][method]:[]);
 const [open,setOpen]=useState(false);const id=useId();
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const cancel=()=>{if(timer.current!==null){clearTimeout(timer.current);timer.current=null;}};
 const show=()=>{cancel();timer.current=setTimeout(()=>{timer.current=null;setOpen(true);},800);};
 const hide=()=>{cancel();setOpen(false);};
 useEffect(()=>{hide();return cancel;},[mode,method,help]);
 const anchor=useRef<HTMLDivElement>(null);
 const tipRef=useRef<HTMLDivElement>(null);
 const dialog=open?anchor.current?.closest<HTMLDialogElement>('.choice-dialog'):null;
 React.useLayoutEffect(()=>{
   const tip=tipRef.current,card=anchor.current;
   if(!dialog||!tip||!card)return;
   function position(){
     if(!tip||!card)return;
     const r=card.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight;
     const gap=6,pad=8;
     const right=r.right+gap+w<=innerWidth-pad,left=r.left-gap-w>=pad;
     const x=right?r.right+gap:left?r.left-gap-w:r.left;
     const y=right||left?r.top:r.bottom+gap+h<=innerHeight-pad?r.bottom+gap:r.top-gap-h;
     tip.style.left=Math.max(pad,Math.min(x,innerWidth-w-pad))+'px';
     tip.style.top=Math.max(pad,Math.min(y,innerHeight-h-pad))+'px';
   }
   position();
   const close=()=>hide();
   dialog.addEventListener('close',close);
   window.addEventListener('resize',position);
   dialog.addEventListener('scroll',position,true);
   return ()=>{dialog.removeEventListener('close',close);window.removeEventListener('resize',position);dialog.removeEventListener('scroll',position,true);};
 },[dialog]);
 const tip=<div ref={tipRef} id={id} role="tooltip" className="method-tooltip"><strong>{t(title)}</strong>{rows.map((text,i)=><div key={i}><b>{t(labels[i])}</b><p>{t(text)}</p></div>)}</div>;
 return <div ref={anchor} className="method-choice" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} onKeyDown={e=>{if(e.key==='Escape'){hide();e.stopPropagation();}}}>
 <button disabled={disabled} type="button" className={selected?'chosen':''} aria-pressed={selected} aria-describedby={open?id:undefined} onClick={()=>{onSelect();show();}}><strong>{t(title)}</strong><span>{t(subtitle??'悬停查看详情')}</span>{provider&&<small>{t(provider)}</small>}</button>
 {open&&(dialog?createPortal(tip,dialog):tip)}
 </div>;
}
