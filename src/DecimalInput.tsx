import {t} from './i18n';
import { useEffect, useState } from 'react';
export function DecimalInput({label,value,min,max,onChange,disabled=false,precision=2}:{label:string;value:number;min:number;max:number;disabled?:boolean;precision?:number;onChange:(n:number)=>void}) {
  const [draft,setDraft]=useState(value.toFixed(precision));
  useEffect(()=>setDraft(value.toFixed(precision)),[value,precision]);
  function commit(){
    const parsed=draft.trim()?Number(draft):NaN;
    const next=Number.isFinite(parsed)?Math.round(Math.max(min,Math.min(max,parsed))*(10**precision))/(10**precision):value;
    setDraft(next.toFixed(precision));onChange(next);
  }
  return <input className="decimal-input" disabled={disabled} aria-label={t(label)} type="number" inputMode="decimal" min={min} max={max} step={10**(-precision)} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/>;
}
