import React,{useEffect,useRef,useState} from 'react';
import {X} from 'lucide-react';
import {t} from './i18n';
import type {Mode} from './core';
import {landmarkIds} from './region';
import {landmarkLabel} from './landmark-labels';

type Props={mode:Mode;offset:number;points:number[];limit:number;replacing?:number;onApply:(points:number[])=>void;onClose:()=>void};
export function CoordinatePointDialog({mode,offset,points,limit,replacing,onApply,onClose}:Props){
  const dialog=useRef<HTMLDialogElement>(null);
  const [selection,setSelection]=useState<number[]>(replacing===undefined?[]:[replacing]);
  const outside=useRef(false);
  useEffect(()=>{const node=dialog.current!;node.showModal();return ()=>node.close();},[]);
  function apply(ids:number[]){onApply(ids);onClose();}
  return <dialog ref={dialog} className="choice-dialog coordinate-point-dialog" aria-labelledby="coordinate-pick-title" onCancel={onClose}
    onPointerDown={e=>{outside.current=e.target===e.currentTarget;}}
    onClick={e=>{if(outside.current&&e.target===e.currentTarget){const box=e.currentTarget.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)onClose();}outside.current=false;}}>
    <header><h2 id="coordinate-pick-title">{t(replacing===undefined?'添加检测点':'替换检测点')}</h2><button className="icon-button" aria-label={t('关闭选择窗口')} onClick={onClose}><X size={18}/></button></header>
    <div className="coordinate-pick-grid">{landmarkIds(mode).map(point=>{
      const id=point+offset,existing=points.includes(id)&&id!==replacing;
      return <button key={id} disabled={existing||(replacing===undefined&&!selection.includes(id)&&points.length+selection.length>=limit)} className={selection.includes(id)?'selected':''} aria-pressed={selection.includes(id)} onClick={()=>{
        if(replacing!==undefined){apply([id]);return;}
        setSelection(current=>current.includes(id)?current.filter(n=>n!==id):[...current,id]);
      }}>{landmarkLabel(mode,point)}</button>;
    })}</div>
    {replacing===undefined&&<footer><button className="primary" disabled={!selection.length} onClick={()=>apply(selection)}>{t('添加所选点')} · {selection.length}</button></footer>}
  </dialog>;
}
