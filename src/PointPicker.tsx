import {facePointStyle} from './face-visual';
import React from 'react';
import type {Mode,Point} from './core';
import {FACE_CORE_POINTS,landmarkIds,trackedPoint,regionPoint,type RegionConfig} from './region';
import {t} from './i18n';
import {landmarkLabel} from './landmark-labels';
export function PointPicker({points,mode,selected,onSelect,region,pair=selected.length===2,compact=false,dense=false}:{points:Point[];mode:Mode;selected:number[];onSelect:(id:number)=>void;region?:RegionConfig;pair?:boolean;compact?:boolean;dense?:boolean}) {
 const ids=(mode==='face'&&!dense?[...new Set([...FACE_CORE_POINTS,...(selected.length<=33?selected:[])])]:landmarkIds(mode)).filter(id=>trackedPoint(mode,points,id));
 const center=region&&mode==='pose'&&region.point===undefined?regionPoint(mode,points,region):null;
 return <svg className="point-picker" viewBox="0 0 1000 750" preserveAspectRatio="none" aria-label={t('点击选择检测点')} onPointerDown={e=>{
  const box=e.currentTarget.getBoundingClientRect();let nearest=-1,distance=22;
  for(const id of ids){const p=trackedPoint(mode,points,id)!;const d=Math.hypot(box.left+p[0]*box.width-e.clientX,box.top+p[1]*box.height-e.clientY);if(d<distance){nearest=id;distance=d;}}
  if(nearest>=0)onSelect(nearest);
 }}>
 {pair&&selected.length===2&&selected.every(id=>ids.includes(id))&&<line x1={(1-points[selected[0]].x)*1000} y1={points[selected[0]].y*750} x2={(1-points[selected[1]].x)*1000} y2={points[selected[1]].y*750} stroke="#e65b60" strokeWidth="2" vectorEffect="non-scaling-stroke"/>}
 {[...ids].sort((a,b)=>Number(selected.includes(a))-Number(selected.includes(b))).map(id=>{const p=trackedPoint(mode,points,id)!,index=selected.indexOf(id),face=mode==='face'?facePointStyle(index>=0,selected.length,dense):null;return <g key={id} className="landmark-item"><circle role="button" tabIndex={0} aria-label={t('选择骨骼点 {0}',landmarkLabel(mode,id))} aria-pressed={index>=0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(id);}}} cx={p[0]*1000} cy={p[1]*750} r={face?face.radius:index>=0?(compact?7:12):(compact?3.5:5)} opacity={face?.opacity} fill={face?face.fill:index>=0?'#dc3545':'#fff'} stroke={face?face.stroke:index>=0?'#fff':'#555'} strokeWidth={face?face.strokeWidth:compact?1.5:index>=0?2.5:1.5} vectorEffect="non-scaling-stroke"/><text className={mode==='face'&&!(pair&&selected.length===2&&index>=0)?'dense-point-label':undefined} x={Math.max(8,Math.min(890,p[0]*1000+(compact?10:16)))} y={Math.max(26,Math.min(730,p[1]*750-(compact?9:14)))} fill="white" stroke="#222" strokeWidth={compact?2.5:4} paintOrder="stroke" fontSize={mode==='face'?13:compact?17:index>=0?28:23} fontWeight={index>=0?700:500} data-landmark-label={id}>{index>=0&&pair&&selected.length===2?`${index===0?'A':'B'} · ${id}`:id}</text></g>;})}
 {center&&<circle cx={center[0]*1000} cy={center[1]*750} r="12" fill="#dc3545" stroke="white" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>}{center&&<text x={Math.min(840,center[0]*1000+16)} y={Math.max(26,center[1]*750-14)} fill="white" stroke="#222" strokeWidth="4" paintOrder="stroke" fontSize="28">{t('髋部中心')}</text>}
 </svg>;
}
