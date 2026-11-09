import React,{useEffect,useId,useRef,useState} from 'react';
import type {Mode} from './core';
import type {LearningMode} from './learning';
import {methodHelp} from './method-help';
import {t} from './i18n';
export function MethodChoice({mode,method,help,provider,title,selected,onSelect,disabled=false,labels=['判断什么','如何设置','输出什么']}:{disabled?:boolean;labels?:readonly string[];mode?:Mode;method?:LearningMode;help?:readonly string[];provider?:string;title:string;selected:boolean;onSelect:()=>void}) {
 const rows=help??(mode&&method?methodHelp[mode][method]:[]);
 const [open,setOpen]=useState(false);const id=useId();
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const cancel=()=>{if(timer.current!==null){clearTimeout(timer.current);timer.current=null;}};
 const show=()=>{cancel();timer.current=setTimeout(()=>{timer.current=null;setOpen(true);},800);};
 const hide=()=>{cancel();setOpen(false);};
 useEffect(()=>{hide();return cancel;},[mode,method,help]);
 return <div className="method-choice" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} onKeyDown={e=>{if(e.key==='Escape'){hide();e.stopPropagation();}}}>
 <button disabled={disabled} type="button" className={selected?'chosen':''} aria-pressed={selected} aria-describedby={open?id:undefined} onClick={()=>{onSelect();show();}}><strong>{t(title)}</strong><span>{t('悬停查看详情')}</span>{provider&&<small>{t(provider)}</small>}</button>
 {open&&<div id={id} role="tooltip" className="method-tooltip"><strong>{t(title)}</strong>{rows.map((text,i)=><div key={i}><b>{t(labels[i])}</b><p>{t(text)}</p></div>)}</div>}
 </div>;
}
