import {t, messageT} from './i18n';
import React from 'react';
import {Circle,Check, X} from 'lucide-react';
export function RecordingControls({recording,preparing,disabled,hasSamples,onStart,onCancel,onSave}:{recording:boolean;preparing:boolean;disabled:boolean;hasSamples:boolean;onStart:()=>void;onCancel:()=>void;onSave:()=>void}){
 return <div className="capture-actions"><button data-recording-toggle aria-keyshortcuts="Space R" className="record-button" disabled={disabled||recording||preparing} onClick={onStart}><Circle size={16} fill="currentColor"/>{recording?t("录制中…"):preparing?t("准备录制…"):hasSamples?t("追加录制"):t("录制示例")}</button><button className="secondary small" disabled={!recording&&!preparing} onClick={onCancel}><X size={15}/>{preparing?t("取消准备"):t("取消录制")}</button><button data-recording-toggle aria-keyshortcuts="Space R" className="primary small" disabled={!recording} onClick={onSave}><Check size={15}/>{t("录好了，保存")}</button></div>;
}
