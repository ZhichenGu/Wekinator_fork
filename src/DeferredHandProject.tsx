import React from 'react';
import {ArrowLeft,Download} from 'lucide-react';
import type {Project} from './core';
import {t} from './i18n';
export function DeferredHandProject({project,onBack}:{project:Project;onBack:()=>void}){
 function download(){
   const url=URL.createObjectURL(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}));
   const link=document.createElement('a');link.href=url;link.download=project.name.replace(/[\\/:*?"<>|]/g,'_')+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 return <main className="deferred-hand-project">
   <button className="text-button" onClick={onBack}><ArrowLeft size={16}/>{t('返回首页')}</button>
   <section><h1>{project.name}</h1><h2>{t('双手与混合动作学习暂缓开放')}</h2>
   <p>{t('项目和录制已保留，可导出备份。当前动作学习使用单手，双手可用于直接输出坐标。')}</p>
   <button className="secondary" onClick={download}><Download size={16}/>{t('导出项目')}</button></section>
 </main>;
}
