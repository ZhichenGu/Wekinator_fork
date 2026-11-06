import React from 'react';
import {landmarkLabel} from './landmark-labels';
import {t} from './i18n';
import {RuleNumber} from './RuleNumber';
import {defaultRelationPoints,selectRelationPoint,type RelationConfig} from './relation';
import {landmarkIds} from './region';
import type {Mode} from './core';
export function RelationControls({value,onChange,disabled,mode,slot,onSlotChange}:{value:RelationConfig;onChange:(v:RelationConfig)=>void;disabled:boolean;mode:Mode;slot:0|1;onSlotChange:(slot:0|1)=>void}) {
 const pair=value.points??defaultRelationPoints(mode);
 return <div className="setting-section"><strong>{t('动作关系')}</strong><p>{t('选择 A 或 B，再点击画面中的骨骼点。只比较这两个点。')}</p><div className="point-slots">{([0,1] as const).map(i=><button key={i} className={slot===i?'selected':''} disabled={disabled} aria-pressed={slot===i} onClick={()=>onSlotChange(i)}>{i===0?'A':'B'} · {landmarkLabel(mode,pair[i])}</button>)}</div>{([0,1] as const).map(i=><label className="field" key={i}>{t('检测点 {0}',i===0?'A':'B')}<select value={pair[i]} disabled={disabled} onChange={e=>onChange({...value,points:selectRelationPoint(pair,i,Number(e.target.value))})}>{landmarkIds(mode).map(id=><option key={id} value={id}>{landmarkLabel(mode,id)}</option>)}</select></label>)}<label className="field">{t('关系规则')}<select value={value.rule} disabled={disabled} onChange={e=>onChange({...value,rule:e.target.value as RelationConfig['rule']})}><option value="distance">{t('距离小于阈值')}</option><option value="above">{t('位于上方')}</option></select></label><p>{t(value.rule==='above'?(mode==='pose'&&!value.points?'双手腕高于各自肩部；选择自定义点后比较 A 是否高于 B。':'判断 A 是否高于 B。'):'距离按目标尺寸归一化，不随窗口大小改变。')}</p>{value.rule==='distance'&&<RuleNumber label="距离阈值（相对尺寸）" value={value.threshold} min={.05} max={5} disabled={disabled} onChange={threshold=>onChange({...value,threshold})}/>}<RuleNumber label="稳定时间（秒）" value={value.seconds} min={.1} max={60} disabled={disabled} onChange={seconds=>onChange({...value,seconds})}/><p>{t('满足关系后触发一次；关系解除后可再次触发。')}</p></div>;
}
