import React from 'react';
import {DecimalInput} from './DecimalInput';
import {t} from './i18n';
export function RuleNumber({label,value,min,max,onChange,disabled}:{label:string;value:number;min:number;max:number;onChange:(n:number)=>void;disabled:boolean}) {
 return <div className="rule-number"><div className="setting-heading"><span>{t(label)}</span><DecimalInput label={label} value={value} min={min} max={max} disabled={disabled} onChange={onChange}/></div><input type="range" aria-label={t('{0}滑条',t(label))} min={min} max={max} step=".01" value={value} disabled={disabled} onChange={e=>onChange(Number(e.target.value))}/></div>;
}
