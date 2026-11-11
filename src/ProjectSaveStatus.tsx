import React, {useLayoutEffect, useRef, useState} from 'react';
import {Check} from 'lucide-react';
import {t} from './i18n';

export function useProjectAutosave<T>(project:T, persist:(project:T)=>void) {
  const persistRef=useRef(persist);
  persistRef.current=persist;
  const [error,setError]=useState('');
  useLayoutEffect(()=>{
    try {
      persistRef.current(project);
      setError('');
    } catch {
      setError('本地保存失败，请导出项目');
    }
  },[project]);
  return error;
}

export function ProjectSaveStatus({error}:{error:string}) {
  return <span className="save-state" role={error?'alert':'status'}>
    {!error&&<Check size={13} aria-hidden="true"/>}
    {t(error||'已保存在此浏览器')}
  </span>;
}
