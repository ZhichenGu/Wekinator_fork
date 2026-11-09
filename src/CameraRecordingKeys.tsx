import React,{useEffect,useRef,useState} from 'react';
import {t} from './i18n';
export function CameraRecordingKeys({recording,preparing,disabled,onStart,onSave,onCancel}:{recording:boolean;preparing:boolean;disabled:boolean;onStart:()=>void;onSave:()=>void;onCancel:()=>void}){
 const [cancelled,setCancelled]=useState(false),timer=useRef<ReturnType<typeof setTimeout>>();
 const flash=()=>{clearTimeout(timer.current);setCancelled(true);timer.current=setTimeout(()=>setCancelled(false),500);};
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&(recording||preparing)&&!e.repeat&&!document.querySelector('dialog[open]')&&!(e.target instanceof HTMLElement&&e.target.closest('input,textarea,select,[contenteditable="true"]')))flash();};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[recording,preparing]);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 return <div className="camera-recording-keys" role="group" aria-label={t('录制快捷键')}><button type="button" data-recording-toggle aria-keyshortcuts="Space R" className={recording||preparing?'active':''} aria-pressed={recording||preparing} disabled={preparing||(!recording&&disabled)} onClick={recording?onSave:onStart} title={t(recording?'保存录制':'开始录制')}><kbd>{t("空格")}</kbd><span>{t(recording?'保存录制':preparing?'准备录制…':'开始录制')}</span></button><button type="button" aria-keyshortcuts="Escape" className={cancelled?'active':''} disabled={!recording&&!preparing&&!cancelled} onClick={()=>{flash();onCancel();}} title={t('取消录制')}><kbd>Esc</kbd><span>{t('取消录制')}</span></button></div>;
}
