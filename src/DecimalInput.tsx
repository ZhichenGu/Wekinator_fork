import { useEffect, useState } from 'react';
export function DecimalInput({label,value,min,max,onChange,disabled=false}:{label:string;value:number;min:number;max:number;disabled?:boolean;onChange:(n:number)=>void}) {
  const [draft,setDraft]=useState(value.toFixed(2));
  useEffect(()=>setDraft(value.toFixed(2)),[value]);
  function commit(){
    const parsed=draft.trim()?Number(draft):NaN;
    const next=Number.isFinite(parsed)?Math.round(Math.max(min,Math.min(max,parsed))*100)/100:value;
    setDraft(next.toFixed(2));onChange(next);
  }
  return <input className="decimal-input" disabled={disabled} aria-label={label} type="number" inputMode="decimal" min={min} max={max} step="0.01" value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/>;
}
