import React,{useRef,useState} from 'react';import type {Action} from './core';import {t} from './i18n';
export function ActionItem({action,index,selected,disabled,renameDisabled,onSelect,onRename}:{action:Action;index:number;selected:boolean;disabled:boolean;renameDisabled:boolean;onSelect:()=>void;onRename:(name:string)=>void}){
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(action.name);const cancelled=useRef(false);
 const begin=()=>{if(disabled||renameDisabled)return;cancelled.current=false;setDraft(action.name);setEditing(true);};
 const commit=()=>{if(!cancelled.current&&draft.trim()&&draft.trim()!==action.name)onRename(draft.trim());setEditing(false);};
 const number=<span className="action-index">{(index+1).toString().padStart(2,'0')}</span>;
 return editing?<div className={'action-item '+(selected?'selected':'')}>{number}<input autoFocus aria-label={t('动作名称')} maxLength={60} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit} onFocus={e=>e.currentTarget.select()} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();cancelled.current=true;setEditing(false);}if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}}}/></div>:<button disabled={disabled} className={'action-item '+(selected?'selected':'')} onClick={onSelect} onDoubleClick={begin} onKeyDown={e=>{if(e.key==='F2'){e.preventDefault();begin();}}} title={t('双击或按 F2 重命名')}>
 {number}<span className="action-item-copy"><strong>{action.name}</strong><small>{action.samples.filter(s=>!s.negative&&s.split!=='test').length}{t('训练 ·')}{action.samples.filter(s=>s.split==='test').length}{t('测试 ·')}{action.trained?t('已训练'):t('待训练')}</small></span><span className={'status-dot '+(action.trained?'ready':'')}/></button>;
}
