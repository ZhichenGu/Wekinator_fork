import React from 'react';
import {MethodChoice} from './MethodChoice';
import {recognitionHelp} from './recognition-help';
import {Activity,Camera,AudioLines,Check,X,type LucideIcon} from 'lucide-react';
import {t} from './i18n';import type {Mode} from './core';import type {LearningMode} from './learning';
export type InputCategory='tracking'|'vision'|'audio';
const methods=[['dynamic','完成后触发一次'],['pose','输出姿态类别'],['continuous','输出连续数值（0–1）'],['region','停留达标时触发'],['relation','条件成立时触发']] as const;
const goals = {
  "hand": {
    "dynamic": "挥一次手",
    "pose": "区分握拳和张掌",
    "continuous": "手掌越张开，数值越大",
    "region": "指尖停在指定区域",
    "relation": "拇指与食指捏合"
  },
  "face": {
    "dynamic": "张嘴再闭嘴",
    "pose": "区分张嘴和闭嘴",
    "continuous": "嘴张得越大，数值越大",
    "region": "鼻尖在区域内停留",
    "relation": "上下唇靠近"
  },
  "pose": {
    "dynamic": "抬起再放下手臂",
    "pose": "区分站立和下蹲",
    "continuous": "蹲得越低，数值越大",
    "region": "手腕在区域内停留",
    "relation": "手腕高于肩膀"
  }
};
export function CreateChoices({category,onCategory,mode,onMode,learning,onLearning,visual,onVisual,audio,onAudio,modes,footer}:{footer?:React.ReactNode;category:InputCategory|null;onCategory:(v:InputCategory)=>void;mode:Mode;onMode:(v:Mode)=>void;learning:LearningMode;onLearning:(v:LearningMode)=>void;visual:'presence'|'count'|'condition';onVisual:(v:'presence'|'count'|'condition')=>void;audio:'keyword'|'event'|'volume';onAudio:(v:'keyword'|'event'|'volume')=>void;modes:Record<Mode,{name:string;description:string;icon:LucideIcon}>}){
 const dialog=React.useRef<HTMLDialogElement>(null);
 const beganOutside=React.useRef(false);
 function outside(event:React.PointerEvent<HTMLDialogElement>|React.MouseEvent<HTMLDialogElement>){
   const r=event.currentTarget.getBoundingClientRect();
   return event.target===event.currentTarget&&(event.clientX<r.left||event.clientX>=r.right||event.clientY<r.top||event.clientY>=r.bottom);
 }
 const show=()=>dialog.current?.showModal();
 React.useEffect(()=>{if(category==='vision'||category==='audio')show();},[category]);
 const categories=[{id:'tracking' as const,name:'动作追踪',description:'手部、面部与身体',icon:Activity},{id:'vision' as const,name:'视觉识别',description:'物体与画面条件 · API',icon:Camera},{id:'audio' as const,name:'声音识别',description:'语音、声音事件与音量 · API',icon:AudioLines}];
 return <div className="create-choices"><div className="category-options" role="group" aria-label={t('输入分类')}>{categories.map(c=><button key={c.id} aria-pressed={category===c.id} aria-expanded={category===c.id} aria-controls="category-details" className={'category-choice '+(category===c.id?'chosen':'')} onClick={()=>{onCategory(c.id);if(c.id!=='tracking'&&category===c.id)show();}}><c.icon size={23}/><span><strong>{t(c.name)}</strong><small>{t(c.description)}</small></span></button>)}</div>
 {category&&<section id="category-details" className="category-details" aria-label={t('分类选项')}>
 {category==='tracking'?<><div className="choice-section-heading"><h2 className="choice-heading">{t('追踪对象')}</h2><small>{t('本机模型')}</small></div><div className="mode-cards tracking-choices">{(Object.keys(modes) as Mode[]).map(key=>{const m=modes[key];return <button key={key} aria-pressed={mode===key} className={'mode-card '+(mode===key?'chosen':'')} onClick={()=>{onMode(key);show();}}><div className="card-top"><span className="mode-icon"><m.icon size={23}/></span><h3>{t(m.name)}</h3><span className="radio-circle">{mode===key&&<Check size={12}/>}</span></div><p>{t(m.description)}</p></button>;})}</div></>:null}
 <dialog ref={dialog} onPointerDown={e=>{beganOutside.current=outside(e);}} onClick={e=>{if(beganOutside.current&&outside(e))e.currentTarget.close();beganOutside.current=false;}} className="choice-dialog" aria-labelledby="choice-dialog-title">
 <header><h2 id="choice-dialog-title">{t(category==='tracking'?modes[mode].name:category==='vision'?'视觉识别':'声音识别')}</h2><button className="icon-button" aria-label={t('关闭选择窗口')} onClick={()=>dialog.current?.close()}><X size={18}/></button></header>
 <div className="choice-dialog-body">{category==='tracking'?<><h2 className="choice-heading">{t('你想实现什么交互？')}</h2><div className="learning-options" role="group" aria-label={t('学习方式')}>{methods.map(([key,title])=><MethodChoice key={key} mode={mode} method={key} title={goals[mode][key]} subtitle={title} provider={key==='region'||key==='relation'?'无需录制示范':undefined} selected={learning===key} onSelect={()=>onLearning(key)}/>)}</div></>:category==='vision'?<><h2 className="choice-heading">{t('识别方式')}</h2><div className="learning-options" role="group" aria-label={t('视觉识别方式')}>{([['presence','物体检测 · API'],['count','人数与物体计数'],['condition','自定义视觉条件']] as const).map(([id,name])=><MethodChoice key={id} title={name} help={recognitionHelp[id]} provider="DeepSeek / OpenAI" selected={visual===id} onSelect={()=>onVisual(id)}/>)}</div></>:
 <><h2 className="choice-heading">{t('声音处理方式')}</h2><div className="learning-options" role="group" aria-label={t('声音处理方式')}>{([['keyword','语音关键词'],['event','声音事件'],['volume','音量控制']] as const).map(([id,name])=><MethodChoice key={id} title={name} help={recognitionHelp[id]} provider={id==='volume'?'本机处理':id==='keyword'?'OpenAI / 科大讯飞':'OpenAI API'} selected={audio===id} onSelect={()=>onAudio(id)}/>)}</div></>}
 </div><footer>{footer}</footer></dialog>
 </section>}
 </div>;
}
