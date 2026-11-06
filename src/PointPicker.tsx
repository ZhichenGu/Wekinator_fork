import React from 'react';
import type {Mode,Point} from './core';
import {landmarkIds,trackedPoint,regionPoint,type RegionConfig} from './region';
import {t} from './i18n';
export function PointPicker({points,mode,selected,onSelect,region}:{points:Point[];mode:Mode;selected:number[];onSelect:(id:number)=>void;region?:RegionConfig}) {
 const ids=landmarkIds(mode).filter(id=>trackedPoint(mode,points,id));
 const center=region&&mode==='pose'&&region.point===undefined?regionPoint(mode,points,region):null;
 return <svg className="point-picker" viewBox="0 0 1000 750" preserveAspectRatio="none" aria-label={t('点击选择检测点')} onPointerDown={e=>{
  const box=e.currentTarget.getBoundingClientRect();let nearest=-1,distance=22;
  for(const id of ids){const p=trackedPoint(mode,points,id)!;const d=Math.hypot(box.left+p[0]*box.width-e.clientX,box.top+p[1]*box.height-e.clientY);if(d<distance){nearest=id;distance=d;}}
  if(nearest>=0)onSelect(nearest);
 }}>
 {selected.length===2&&selected.every(id=>ids.includes(id))&&<line x1={(1-points[selected[0]].x)*1000} y1={points[selected[0]].y*750} x2={(1-points[selected[1]].x)*1000} y2={points[selected[1]].y*750} stroke="#e65b60" strokeWidth="2" vectorEffect="non-scaling-stroke"/>}
 {ids.map(id=>{const p=trackedPoint(mode,points,id)!,index=selected.indexOf(id);return <g key={id}><circle role="button" tabIndex={0} aria-label={t('选择骨骼点 {0}',id)} aria-pressed={index>=0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(id);}}} cx={p[0]*1000} cy={p[1]*750} r={index>=0?9:5} fill={index>=0?'#dc3545':'#fff'} stroke={index>=0?'#fff':'#555'} strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>{index>=0&&<text x={p[0]*1000+15} y={p[1]*750-12} fill="white" stroke="#222" strokeWidth="3" paintOrder="stroke" fontSize="22">{selected.length===2?(index===0?'A':'B'):id}</text>}</g>;})}
 {center&&<circle cx={center[0]*1000} cy={center[1]*750} r="9" fill="#dc3545" stroke="white" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>}
 </svg>;
}
