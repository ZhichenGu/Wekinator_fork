import React from 'react';
import {t} from './i18n';
export type OutputType='indicator'|'serial'|'mqtt'|'osc';
export function OutputChoices({value,disabled,onChange}:{value:OutputType;disabled:boolean;onChange:(value:OutputType)=>void}){
 const choices:{value:OutputType;label:string}[]=[{value:'indicator',label:t('状态灯')},{value:'serial',label:'Serial'},{value:'mqtt',label:'MQTT'},{value:'osc',label:'OSC'}];
 return <div className="output-choices" role="group" aria-label={t('输出方式')}>{choices.map(choice=><button key={choice.value} type="button" className={choice.value===value?'selected':''} aria-pressed={choice.value===value} disabled={disabled} onClick={()=>{if(choice.value!==value)onChange(choice.value);}}>{choice.label}</button>)}</div>;
}
