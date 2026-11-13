import React,{useState} from 'react';
import {defaultOscTarget,cleanOscTarget,oscArgument,type OscType,type OscTarget} from './osc';
import {t} from './i18n';

const desktop = import.meta.env?.MODE === 'desktop';

export async function sendOsc(value:string|number|{id:number;values:number[];name?:string;axes?:string[]}[],target:OscTarget=defaultOscTarget(typeof value==='number'),positive=true) {
  try {
    const vector=Array.isArray(value);
    const argument=vector?{type:'float',value}:oscArgument(value,target,positive);
    const path=vector?(value.some(p=>p.name!==undefined)?'osc/axes':'osc/coordinates'):argument.type==='integer'?'osc/int32':'osc';
    const res=await fetch((desktop ? '/api/desktop/' : 'http://127.0.0.1:8765/')+path,{
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({host:target.host,port:target.port,address:target.address,...(vector?{points:value}:{value:argument.value})}),
      credentials:'omit', redirect:'error', signal:AbortSignal.timeout(10000)
    });
    if((vector||path==='osc/int32')&&res.status===404) throw new RangeError();
    if(res.status!==204) throw Error();
  } catch (error) {
    if(desktop) throw Error(t('OSC 发送失败，请检查接收端地址和端口。'));
    if(error instanceof RangeError) throw Error(t('请重新下载并启动新版 OSC 桥接。'));
    throw Error(t('OSC 发送失败，请启动本机桥接并允许浏览器访问本地网络。'));
  }
}

export function OscPanel({coordinates=false,continuous=false,target,onSave,disabled,onTest,yesText='YES',noText,sendNo=true}:{coordinates?:boolean;continuous?:boolean;target?:OscTarget;yesText?:string;noText?:string;sendNo?:boolean;onSave:(target:OscTarget)=>void;disabled:boolean;onTest:()=>void}) {
  const saved=target??defaultOscTarget(continuous);
  const [host,setHost]=useState(saved.host),[port,setPort]=useState(String(saved.port)),[address,setAddress]=useState(saved.address);
  const savedType=saved.trigger?.type??'string';
  const savedYes=saved.trigger?.yes??yesText;
  const savedNo=saved.trigger?.no??(savedType==='string'?noText:'0')??'';
  const [type,setType]=useState<OscType>(savedType);
  const [yes,setYes]=useState(savedYes),[no,setNo]=useState(savedNo);
  function changeType(next:OscType){
    if (next==='string' || type==='string') {
      setYes(next==='string'?yesText:'1');
      setNo(next==='string'?(noText??''):'0');
    }
    setType(next);
  }
  const dirty=(!continuous&&(type!==savedType||yes!==savedYes||(noText!==undefined&&no!==savedNo)))||host!==saved.host || port!==String(saved.port) || address!==saved.address;
  const [error,setError]=useState(false);
  function save(){
    try{const config=cleanOscTarget({host:host.trim(),port:Number(port),address:address.trim(),trigger:continuous?undefined:{type,yes,no:noText===undefined?undefined:no}});onSave(config);setHost(config.host);setPort(String(config.port));setAddress(config.address);setError(false);}
    catch{setError(true);}
  }
  return <div className="setting-section">
    <p>{t(desktop ? '在接收软件中监听下方 UDP 端口。' : '在浏览器所在电脑运行桥接程序，接收软件监听下方 UDP 端口。')}</p>
    <label className="field compact">{t('接收端 IPv4')}<input value={host} onChange={e=>setHost(e.target.value)} disabled={disabled}/></label>
    <label className="field compact">{t('UDP 端口')}<input type="number" min="1" max="65535" value={port} onChange={e=>setPort(e.target.value)} disabled={disabled}/></label>
    <label className="field compact">{t('OSC 地址')}<input value={address} maxLength={160} onChange={e=>setAddress(e.target.value)} disabled={disabled}/></label>
    {continuous?<p>{t(coordinates?'按窗口预览的地址发送，每个勾选轴为一个浮点参数。':'参数类型：浮点数（f）')}</p>:<>
      <label className="field compact">{t('OSC 参数类型')}<select value={type} onChange={e=>changeType(e.target.value as OscType)} disabled={disabled}>
        <option value="string">String</option><option value="integer">Integer (int32)</option><option value="float">Float (float32)</option>
      </select></label>
      <label className="field compact">{t(noText===undefined?'触发值':'YES 时发送')}<input value={yes} maxLength={512} disabled={disabled} onChange={e=>setYes(e.target.value)}/></label>
      {noText!==undefined&&sendNo&&<label className="field compact">{t('NO 时发送')}<input value={no} maxLength={512} disabled={disabled} onChange={e=>setNo(e.target.value)}/></label>}
    </>}
    {dirty&&<><button type="button" className="secondary small" disabled={disabled} onClick={save}>{t('应用目标')}</button><p>{t('当前发送目标')} <code>{saved.host}:{saved.port} {saved.address}</code></p></>}
    {dirty&&error&&<p role="alert">{t('请检查 IP、端口、路径及发送值。整数须在 int32 范围内，浮点数须是有限数值。')}</p>}
    {!desktop && <p><code>node platform_osc_bridge.mjs</code></p>}
    <div className="osc-actions">
      <button className="secondary small" type="button" disabled={disabled||dirty} onClick={onTest}>{t('测试发送')}</button>
      {!desktop && <a href={(import.meta.env?.BASE_URL??'/')+'examples/platform_osc_bridge.mjs'} download>{t('下载 OSC 桥接')}</a>}
    </div>
  </div>;
}
