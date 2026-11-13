import React,{useEffect,useRef,useState,type ReactNode} from 'react';
import {X} from 'lucide-react';
import {t,messageT} from './i18n';
import type {Mode} from './core';
import {cleanCoordinateConfig,coordinateOutputIds,coordinateAxes,coordinateName,type CoordinateAxis,type CoordinateConfig} from './coordinates';
import {landmarkLabel} from './landmark-labels';

type Props={mode:Mode;protocol:string;config:CoordinateConfig;prefix:string;onApply:(config:CoordinateConfig)=>void;onClose:()=>void;connection:(config:CoordinateConfig)=>ReactNode};
export function CoordinateOutputDialog({mode,protocol,config,prefix,onApply,onClose,connection}:Props) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [draft,setDraft]=useState<CoordinateConfig>(()=>({...config,named:true,
    names:Object.fromEntries(config.points.map(id=>[id,coordinateName(mode,id,config)])),enabledAxes:coordinateAxes(config)}));
  const [error,setError]=useState('');
  const beganOutside=useRef(false);
  useEffect(()=>{const node=dialog.current!;if(!node.open)node.showModal();return ()=>node.close();},[]);
  function outside(event:React.MouseEvent<HTMLDialogElement>|React.PointerEvent<HTMLDialogElement>){
    const box=event.currentTarget.getBoundingClientRect();
    return event.target===event.currentTarget&&(event.clientX<box.left||event.clientX>=box.right||event.clientY<box.top||event.clientY>=box.bottom);
  }
  const axes=coordinateAxes(draft);
  function selectAxis(axis:CoordinateAxis){
    const selected=axes.includes(axis)?axes.filter(a=>a!==axis):(['x','y','z'] as const).filter(a=>a===axis||axes.includes(a));
    if(!selected.length)return;
    setDraft(d=>({...d,enabledAxes:selected,axes:selected.includes('z')?'xyz':'xy'}));setError('');
  }
  function apply(){
    try{onApply(cleanCoordinateConfig(mode,draft));onClose();}
    catch(e){setError((e as Error).message);}
  }
  let valid=true;
  try{cleanCoordinateConfig(mode,draft);}catch{valid=false;}
  return <dialog ref={dialog} className="choice-dialog coordinate-output-dialog" aria-labelledby="coordinate-output-title"
    onCancel={onClose} onPointerDown={e=>{beganOutside.current=outside(e);}}
    onClick={e=>{if(beganOutside.current&&outside(e))onClose();beganOutside.current=false;}}>
    <header><h2 id="coordinate-output-title">{protocol} · {t('坐标输出')}</h2><button className="icon-button" aria-label={t('关闭输出设置')} onClick={onClose}><X size={18}/></button></header>
    <div className="coordinate-dialog-content">
      <fieldset className="coordinate-axis-options"><legend>{t('选择输出轴')}</legend>{(['x','y','z'] as const).map(axis=><label key={axis}><input type="checkbox" checked={axes.includes(axis)} disabled={axes.length===1&&axes.includes(axis)} onChange={()=>selectAxis(axis)}/>{axis.toUpperCase()}</label>)}</fieldset>
      <p className="object-help">{t('每个勾选的轴都有独立名称。Z 为相对深度。')}</p>
      <div className="coordinate-name-list">{coordinateOutputIds(draft).map(id=><section key={id}>
        <label className="field">{config.handMode==='dual'?t(id<21?'左手':'右手')+' · '+landmarkLabel(mode,id%21):landmarkLabel(mode,id)}<input aria-label={t('检测点 {0} 的输出名称',id)} maxLength={16} value={draft.names?.[id]??''} onChange={e=>{setDraft(d=>({...d,names:{...d.names,[id]:e.target.value}}));setError('');}}/></label>
      </section>)}</div>
      <details className="coordinate-fields-preview"><summary>{t('输出字段预览')}</summary><div className="coordinate-addresses" aria-label={t('生成的输出名称')}>{coordinateOutputIds(draft).flatMap(id=>axes.map(axis=><code key={id+'_'+axis}>{protocol==='OSC'?prefix+'/'+(draft.names?.[id]??'')+'/'+axis:(draft.names?.[id]??'')+'_'+axis}</code>))}</div></details>
      <p className="object-help">{t('名称使用最多 16 个字母、数字或下划线，以字母开头，各点名称需不同。')}</p>
      <details className="coordinate-connection"><summary>{t('连接参数与测试')}</summary>{valid?connection(draft):<p role="status">{t('请先填写有效且不同的输出名称。')}</p>}</details>
      {error&&<p role="alert">{messageT(error)}</p>}
    </div>
    <footer><button className="primary" onClick={apply}>{t('应用并返回')}</button></footer>
  </dialog>;
}
