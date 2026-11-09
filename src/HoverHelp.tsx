import React,{useEffect,useId,useRef,useState} from 'react';
import {t} from './i18n';
export function HoverHelp({children,title,rows}:{children:React.ReactNode;title:string;rows:readonly (readonly [string,string])[]}){
 const [open,setOpen]=useState(false),id=useId(),timer=useRef<ReturnType<typeof setTimeout>>();
 const hide=()=>{clearTimeout(timer.current);setOpen(false);};
 const show=()=>{clearTimeout(timer.current);timer.current=setTimeout(()=>setOpen(true),800);};
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 return <div className="inline-help" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} onKeyDown={e=>{if(e.key==='Escape'){hide();e.stopPropagation();}}} aria-describedby={open?id:undefined}>{children}{open&&<div className="method-tooltip" role="tooltip" id={id}><strong>{t(title)}</strong>{rows.map(([label,text])=><div key={label}><b>{t(label)}</b><p>{t(text)}</p></div>)}</div>}</div>;
}
