import React,{useCallback,useLayoutEffect,useRef,useState} from 'react';
import {ArrowUp,ArrowDown} from 'lucide-react';
import {t} from './i18n';

/** A bounded, newest-first history with explicit cues independent of OS scrollbar settings. */
export function HistoryList({children,latestKey,label}:{children:React.ReactNode;latestKey:string;label:string}){
 const viewport=useRef<HTMLDivElement>(null),content=useRef<HTMLDivElement>(null);
 const [edges,setEdges]=useState({up:false,down:false});
 const measure=useCallback(()=>{const el=viewport.current;if(!el)return;const next={up:el.scrollTop>1,down:el.scrollHeight-el.clientHeight-el.scrollTop>1};setEdges(old=>old.up===next.up&&old.down===next.down?old:next);},[]);
 useLayoutEffect(()=>{const el=viewport.current;if(el)el.scrollTop=0;measure();},[latestKey,measure]);
 useLayoutEffect(()=>{const observer=new ResizeObserver(measure);if(viewport.current)observer.observe(viewport.current);if(content.current)observer.observe(content.current);return()=>observer.disconnect();},[measure]);
 const move=(direction:number)=>{const el=viewport.current;if(el){el.scrollTop+=direction*Math.max(80,el.clientHeight*.8);measure();}};
 return <div className="history-list"><div className="history-navigation"><span>{t('最新在前')}</span>{(edges.up||edges.down)&&<div><button type="button" disabled={!edges.up} onClick={()=>move(-1)}><ArrowUp size={13}/>{t(edges.up?'上方还有记录':'已到顶部')}</button><button type="button" disabled={!edges.down} onClick={()=>move(1)}><ArrowDown size={13}/>{t(edges.down?'下方还有记录':'已到底部')}</button></div>}</div><div ref={viewport} className="history-viewport" role="region" aria-label={t(label)} tabIndex={0} onScroll={measure}><div ref={content}>{children}</div></div></div>;
}
