import {FACE_CONTOURS,faceContourOpacity} from './face-visual';
import {t, messageT} from './i18n';
import React from 'react';
import type {Mode,Point} from './core';
const edges = (mode:Mode):number[][] => mode==='hand' ? [[0,1,2,3,4],[0,5,6,7,8],[5,9,10,11,12],[9,13,14,15,16],[13,17,18,19,20],[0,17]] : mode==='pose' ? [[11,12,24,23,11],[11,13,15],[12,14,16],[23,25,27],[24,26,28]] : [[33,133],[263,362],[61,13,291,14,61],[1,4],[10,152]];
export function Skeleton({points,mode,focus,hidePoints=false}:{points:Point[];mode:Mode;focus?:number[];hidePoints?:boolean}) {
  if (!points.length) return null;
  if(mode==='hand'&&points.length===42)return <><Skeleton points={points.slice(0,21)} mode="hand" focus={focus} hidePoints={hidePoints}/><Skeleton points={points.slice(21,42)} mode="hand" focus={focus} hidePoints={hidePoints}/><svg className="coordinate-hand-labels" viewBox="0 0 1000 750" preserveAspectRatio="none">{[0,1].map(hand=>{const p=points[hand*21];return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)?<text key={hand} x={Math.max(25,Math.min(940,(1-p.x)*1000))} y={Math.max(25,Math.min(720,p.y*750+30))}>{t(hand===0?'左':'右')}</text>:null;})}</svg></>;
  const visible=(id:number)=>!!points[id]&&Number.isFinite(points[id].x)&&Number.isFinite(points[id].y)&&(mode!=='pose'||(points[id].visibility??1)>=.45);
  if(mode==='face')return <svg className="skeleton face-contours" viewBox="0 0 1000 750" preserveAspectRatio="none" aria-label={t('面部轮廓叠加层')}>{FACE_CONTOURS.map(group=><g key={group.name} data-face-contour={group.name} opacity={faceContourOpacity(group,focus)}>{group.paths.flatMap((path,i)=>path.slice(1).map((id,j)=>visible(path[j])&&visible(id)?<line key={`${i}-${j}`} x1={points[path[j]].x*1000} y1={points[path[j]].y*750} x2={points[id].x*1000} y2={points[id].y*750} stroke="#e5edf5" strokeWidth="1" vectorEffect="non-scaling-stroke"/>:null))}</g>)}</svg>;
  return <svg className="skeleton" viewBox="0 0 1000 750" preserveAspectRatio="none" aria-label={t("检测骨骼叠加层")}>
    {edges(mode).flatMap((ids,i)=>ids.slice(1).map((id,j)=>visible(ids[j])&&visible(id)?<line key={`${i}-${j}`} x1={points[ids[j]].x*1000} y1={points[ids[j]].y*750} x2={points[id].x*1000} y2={points[id].y*750} stroke="#e6e6e6" strokeWidth="3"/>:null))}
    {!hidePoints&&points.filter((_,i)=>visible(i)).map((p,i)=><circle key={i} cx={p.x*1000} cy={p.y*750} r={4} opacity={mode==='hand'?.75:1} fill="#fff" stroke="#666666" strokeWidth="2"/>)}
  </svg>;
}
