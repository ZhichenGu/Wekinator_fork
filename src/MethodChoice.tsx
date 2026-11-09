import React,{useId,useState} from 'react';
import type {Mode} from './core';
import type {LearningMode} from './learning';
import {methodHelp} from './method-help';
import {t} from './i18n';
export function MethodChoice({mode,method,title,selected,onSelect}:{mode:Mode;method:LearningMode;title:string;selected:boolean;onSelect:()=>void}) {
 const [open,setOpen]=useState(false);const id=useId();
 return <div className="method-choice" onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)} onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);e.stopPropagation();}}}>
 <button type="button" className={selected?'chosen':''} aria-pressed={selected} aria-describedby={open?id:undefined} onClick={()=>{onSelect();setOpen(true);}}><strong>{t(title)}</strong><span>{t('悬停查看详情')}</span></button>
 {open&&<div id={id} role="tooltip" className="method-tooltip"><strong>{t(title)}</strong>{methodHelp[mode][method].map((text,i)=><div key={i}><b>{t(['判断什么','如何设置','输出什么'][i])}</b><p>{t(text)}</p></div>)}</div>}
 </div>;
}
