import React from 'react';
import type {Mode,Point} from './core';
const edges = (mode:Mode):number[][] => mode==='hand' ? [[0,1,2,3,4],[0,5,6,7,8],[5,9,10,11,12],[9,13,14,15,16],[13,17,18,19,20],[0,17]] : mode==='pose' ? [[11,12,24,23,11],[11,13,15],[12,14,16],[23,25,27],[24,26,28]] : [[33,133],[263,362],[61,13,291,14,61],[1,4],[10,152]];
export function Skeleton({points,mode}:{points:Point[];mode:Mode}) {
  if (!points.length) return null;
  const visible=(id:number)=>!!points[id]&&Number.isFinite(points[id].x)&&Number.isFinite(points[id].y)&&(mode!=='pose'||(points[id].visibility??1)>=.45);
  return <svg className="skeleton" viewBox="0 0 1000 750" preserveAspectRatio="none" aria-label="检测骨骼叠加层">
    {edges(mode).flatMap((ids,i)=>ids.slice(1).map((id,j)=>visible(ids[j])&&visible(id)?<line key={`${i}-${j}`} x1={points[ids[j]].x*1000} y1={points[ids[j]].y*750} x2={points[id].x*1000} y2={points[id].y*750} stroke="#e6e6e6" strokeWidth="3"/>:null))}
    {points.filter((_,i)=>visible(i)&&(mode!=='face'||[1,4,33,133,263,362,61,291,13,14,152,10].includes(i))).map((p,i)=><circle key={i} cx={p.x*1000} cy={p.y*750} r={mode==='face'?3:4} fill="#fff" stroke="#666666" strokeWidth="2"/>)}
  </svg>;
}
