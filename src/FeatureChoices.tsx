import React from 'react';import type {FeatureMode} from './core';import {MethodChoice} from './MethodChoice';
export const featureHelp={
 both:['同时比较关注点之间的形状变化，以及这些点在画面中的移动路径。','适合一边捏合、一边移动等既有形变又有位移的动作。','允许一定速度差异，不是单独比较动作速度。'],
 shape:['比较关注点相对参考位置和尺寸的姿态结构，不比较整段的移动路径。','适合握拳、张手、捏合或表情变化；平移位置不会作为整体轨迹比较。','不是只看速度；手势形状仍会随时间参与动态匹配。'],
 path:['比较关注点中心的移动路径，不比较局部关节形状。','适合画圈、挥动等轨迹；未自定义关注部位时使用原有手腕、鼻尖或髋部中心。','时间对齐允许一定快慢差异，因此它也不是速度检测器。']
} as const;
export function FeatureChoices({value,disabled,onChange}:{value:FeatureMode;disabled:boolean;onChange:(value:FeatureMode)=>void}){return <div className="feature-choices">{([['both','形变 + 整体轨迹'],['shape','只看局部形变'],['path','只看整体轨迹']] as const).map(([id,title])=><MethodChoice key={id} title={title} help={featureHelp[id]} labels={['比较什么','适合什么','速度说明']} selected={value===id} disabled={disabled} onSelect={()=>onChange(id)}/>)}</div>;}
