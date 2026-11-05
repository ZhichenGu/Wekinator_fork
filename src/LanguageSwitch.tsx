import {t, messageT} from './i18n';
import React,{useEffect,useSyncExternalStore} from 'react';
import {Globe} from 'lucide-react';
import {getLanguage,subscribeLanguage,setLanguage,type Language} from './i18n';
export function useLanguage(){return useSyncExternalStore(subscribeLanguage,getLanguage,()=> 'zh' as Language);}
export function LanguageSwitch(){const lang=useLanguage();useEffect(()=>{document.documentElement.lang=lang==='zh'?'zh-CN':'en';document.title='Platform';},[lang]);return <div className="language-switch" role="group" aria-label={lang==='zh'?t("语言 / Language"):t("Language / 语言")}><Globe size={16} aria-hidden="true"/><button type="button" lang="zh-CN" aria-pressed={lang==='zh'} onClick={()=>setLanguage('zh')}>{t("中文")}</button><span aria-hidden="true">/</span><button type="button" lang="en" aria-pressed={lang==='en'} onClick={()=>setLanguage('en')}>English</button></div>;}
