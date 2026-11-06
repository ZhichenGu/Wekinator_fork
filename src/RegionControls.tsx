import React from 'react';
import {landmarkLabel} from './landmark-labels';
import {t} from './i18n';
import {RuleNumber} from './RuleNumber';
import {landmarkIds,type RegionConfig} from './region';
import type {Mode} from './core';
export function RegionControls({value,onChange,disabled,mode}:{value:RegionConfig;onChange:(v:RegionConfig)=>void;disabled:boolean;mode:Mode}) {
 return <div className="setting-section"><strong className="setting-main">{t('区域与停留')}</strong><p>{t('点击画面中的骨骼点，选择一个检测点。红点进入区域后开始计时。')}</p><label className="field">{t('检测点')}<select value={value.point??(mode==='hand'?0:mode==='face'?1:'center')} disabled={disabled} onChange={e=>{const {point,...rest}=value;onChange(e.target.value==='center'?rest:{...rest,point:Number(e.target.value)});}}>{mode==='pose'&&<option value="center">{t('髋部中心')}</option>}{landmarkIds(mode).map(id=><option key={id} value={id}>{landmarkLabel(mode,id)}</option>)}</select></label>
 {(['x','y','width','height'] as const).map(k=><RuleNumber key={k} label={{x:'左侧位置（%）',y:'顶部位置（%）',width:'区域宽度（%）',height:'区域高度（%）'}[k]} value={value[k]*100} min={k==='width'||k==='height'?5:0} max={Math.round((k==='x'?1-value.width:k==='y'?1-value.height:k==='width'?1-value.x:1-value.y)*10000)/100} disabled={disabled} onChange={n=>onChange({...value,[k]:n/100})}/>)}
 <RuleNumber label="停留时间（秒）" value={value.seconds} min={.1} max={60} disabled={disabled} onChange={seconds=>onChange({...value,seconds})}/><p>{t('停留达标触发一次；移出区域后可再次触发。追踪丢失会中断计时。')}</p></div>;
}
