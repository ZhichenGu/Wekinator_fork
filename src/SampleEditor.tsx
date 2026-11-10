import React,{useEffect,useRef,useState} from 'react';import {X,RotateCcw} from 'lucide-react';
import {t,messageT} from './i18n';import type {Mode,Sample} from './core';import {Skeleton} from './Skeleton';import {DecimalInput} from './DecimalInput';import {trimSample} from './trim';
export function SampleEditor({sample,mode,onClose,onApply,comparison,label}:{sample:Sample;mode:Mode;onClose:()=>void;onApply?:(s:Sample)=>void;comparison?:{sample:Sample;name:string};label?:string}){
 const ref=useRef<HTMLDialogElement>(null);const [index,setIndex]=useState(0),[start,setStart]=useState(0),[end,setEnd]=useState(sample.duration/1000),[error,setError]=useState('');
 useEffect(()=>{const d=ref.current!;d.showModal();return()=>d.close();},[]);
 const [playing,setPlaying]=useState(!onApply);
 const position=useRef(0);
 useEffect(()=>{
   if(!playing)return;
   const origin=performance.now()-sample.frames[position.current].t;
   let frame:number;
   const tick=(now:number)=>{
     let i=position.current;
     while(i+1<sample.frames.length&&sample.frames[i+1].t<=now-origin)i++;
     position.current=i;setIndex(i);
     if(i===sample.frames.length-1)setPlaying(false);
     else frame=requestAnimationFrame(tick);
   };
   frame=requestAnimationFrame(tick);
   return ()=>cancelAnimationFrame(frame);
 },[playing,sample]);
 const preview=sample.frames[index];
 const reference=comparison?.sample;
 const fraction=(preview.t-sample.frames[0].t)/sample.duration;
 const referenceTime=reference?reference.frames[0].t+fraction*reference.duration:0;
 const otherFrame=reference?.frames.reduce((best,f)=>Math.abs(f.t-referenceTime)<Math.abs(best.t-referenceTime)?f:best);
 function boundary(value:number,kind:'start'|'end'){setError('');if(kind==='start')setStart(value);else setEnd(value);const ms=value*1000;const nearest=sample.frames.reduce((best,f,i)=>Math.abs(f.t-ms)<Math.abs(sample.frames[best].t-ms)?i:best,0);setIndex(nearest);}
 function apply(){try{const trimmed=trimSample(sample,start*1000,Math.min(sample.duration,end*1000));onApply?.(trimmed);}catch(e){setError((e as Error).message);}}
 return <dialog ref={ref} className="sample-editor" aria-labelledby="sample-editor-title" onCancel={e=>{e.preventDefault();onClose();}}><header><div><h2 id="sample-editor-title">{t(comparison?'动作混淆对照':onApply?'检查与裁剪示例':sample.split==='test'?'测试录制回放':'训练示例回放')}</h2>{onApply&&<p>{t('只保留选定区间；应用后需要重新检查训练或测试结果。')}</p>}</div><button className="icon-button" aria-label={t('关闭回放')} onClick={onClose}><X size={20}/></button></header><div className={comparison?'replay-pair':undefined}><div>{comparison&&<strong>{t('待检查录制 · {0}',label)}</strong>}<div className="replay-stage" style={{aspectRatio:sample.aspectRatio??4/3}}><Skeleton points={preview.points} mode={mode}/></div></div>
 {comparison&&otherFrame&&<div><strong>{t('训练示范 · {0}',comparison.name)}</strong><div className="replay-stage" style={{aspectRatio:comparison.sample.aspectRatio??4/3}}><Skeleton points={otherFrame.points} mode={mode}/></div></div>}</div>
 {comparison&&<p>{t('两段录制按各自的完成进度同步播放。')}</p>}<div className="replay-controls">{onApply?<RotateCcw size={17}/>:<button className="secondary small" onClick={()=>{if(!playing&&index===sample.frames.length-1){position.current=0;setIndex(0);}setPlaying(!playing);}}>{t(playing?'暂停':'播放')}</button>}<input aria-label={t('回放时间轴')} type="range" min="0" max={sample.frames.length-1} value={index} onChange={e=>{setPlaying(false);position.current=+e.target.value;setIndex(position.current);}}/><span>{(preview.t/1000).toFixed(2)} s</span></div>{onApply&&<><div className="trim-inputs"><label>{t('起点（秒）')}<DecimalInput label={t('裁剪起点')} value={start} min={0} max={sample.duration/1000} onChange={v=>boundary(v,'start')}/></label><button className="secondary small" onClick={()=>boundary(preview.t/1000,'start')}>{t('当前帧设为起点')}</button><label>{t('终点（秒）')}<DecimalInput label={t('裁剪终点')} value={end} min={0} max={sample.duration/1000} onChange={v=>boundary(v,'end')}/></label><button className="secondary small" onClick={()=>boundary(preview.t/1000,'end')}>{t('当前帧设为终点')}</button></div><p>{t('保留时长：{0} 秒',Math.max(0,end-start).toFixed(2))}</p>{error&&<p className="object-notice" role="alert">{messageT(error)}</p>}<footer><button className="secondary" onClick={()=>{setStart(0);setEnd(sample.duration/1000);setIndex(0);setError('');}}>{t('恢复完整区间')}</button><button className="secondary" onClick={onClose}>{t('取消')}</button><button className="primary" disabled={start===0&&end===sample.duration/1000} onClick={apply}>{t('应用裁剪')}</button></footer></>}</dialog>;
}
