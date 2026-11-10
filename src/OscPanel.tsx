import React,{useState} from 'react';
import {defaultOscTarget,cleanOscTarget,type OscTarget} from './osc';
import {t} from './i18n';

export async function sendOsc(value:string|number,target:OscTarget=defaultOscTarget(typeof value==='number')) {
  try {
    const res=await fetch('http://127.0.0.1:8765/osc',{
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...cleanOscTarget(target),value}),
      credentials:'omit', redirect:'error', signal:AbortSignal.timeout(10000)
    });
    if(res.status!==204) throw Error();
  } catch {
    throw Error(t('OSC 发送失败，请启动本机桥接并允许浏览器访问本地网络。'));
  }
}

export function OscPanel({continuous=false,target,onSave,disabled,onTest}:{continuous?:boolean;target?:OscTarget;onSave:(target:OscTarget)=>void;disabled:boolean;onTest:()=>void}) {
  const saved=target??defaultOscTarget(continuous);
  const [host,setHost]=useState(saved.host),[port,setPort]=useState(String(saved.port)),[address,setAddress]=useState(saved.address);
  const dirty=host!==saved.host || port!==String(saved.port) || address!==saved.address;
  const [error,setError]=useState(false);
  function save(){
    try{const config=cleanOscTarget({host:host.trim(),port:Number(port),address:address.trim()});onSave(config);setHost(config.host);setPort(String(config.port));setAddress(config.address);setError(false);}
    catch{setError(true);}
  }
  return <div className="setting-section">
    <p>{t('在浏览器所在电脑运行桥接程序，接收软件监听下方 UDP 端口。')}</p>
    <label className="field compact">{t('接收端 IPv4')}<input value={host} onChange={e=>setHost(e.target.value)} disabled={disabled}/></label>
    <label className="field compact">{t('UDP 端口')}<input type="number" min="1" max="65535" value={port} onChange={e=>setPort(e.target.value)} disabled={disabled}/></label>
    <label className="field compact">{t('OSC 地址')}<input value={address} maxLength={160} onChange={e=>setAddress(e.target.value)} disabled={disabled}/></label>
    {dirty&&<><button type="button" className="secondary small" disabled={disabled} onClick={save}>{t('应用目标')}</button><p>{t('当前发送目标')} <code>{saved.host}:{saved.port} {saved.address}</code></p></>}
    {dirty&&error&&<p role="alert">{t('请填写本机或私有 IPv4、1–65535 端口及以 / 开头的路径。')}</p>}
    <p>{continuous?t('参数类型：浮点数（f）'):t('参数类型：文本（s）')}</p>
    <p><code>node platform_osc_bridge.mjs</code></p>
    <div className="osc-actions">
      <button className="secondary small" type="button" disabled={disabled||dirty} onClick={onTest}>{t('测试发送')}</button>
      <a href={(import.meta.env?.BASE_URL??'/')+'examples/platform_osc_bridge.mjs'} download>{t('下载 OSC 桥接')}</a>
    </div>
  </div>;
}
