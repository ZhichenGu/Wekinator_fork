import React from 'react';import {ChevronDown} from 'lucide-react';import {t} from './i18n';
export function ApiConfigHeader({expanded,onToggle,controls,provider,status}:{expanded:boolean;onToggle:()=>void;controls:string;provider:string;status:string}){
 return <div className="api-config-heading"><h2><button type="button" className="api-config-toggle" aria-expanded={expanded} aria-controls={controls} aria-label={t(expanded?'收起 API 配置':'展开 API 配置')} onClick={onToggle}><span><strong>{t('API 配置')}</strong><small>{t(provider)} · {t(status)}</small></span><ChevronDown size={18} className={expanded?'':'collapsed'} aria-hidden="true"/></button></h2></div>;
}
