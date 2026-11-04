import { useCallback, useEffect, useRef, useState } from 'react';
import { BAUD_RATES, DEFAULT_MESSAGE, portLabel, SerialConnection, type DevicePort, type SerialAPI, type SerialMessage } from './serial';

export function useSerialOutput() {
  const api = typeof navigator === 'undefined' ? undefined : (navigator as Navigator & {serial?: SerialAPI}).serial;
  const connection=useRef(new SerialConnection());
  const [ports,setPorts]=useState<DevicePort[]>([]);
  const [selected,setSelected]=useState<DevicePort|null>(null);
  const [status,setStatus]=useState<'idle'|'opening'|'connected'|'sending'|'closing'>('idle');
  const [feedback,setFeedback]=useState('');
  const [error,setError]=useState('');
  const statusRef=useRef(status);statusRef.current=status;
  const refresh=useCallback(async()=>{
    if (!api) return;
    try { const next=await api.getPorts();setPorts(next);setSelected(p=>p&&next.includes(p)?p:next[0]??null); }
    catch(e){setError(e instanceof Error?e.message:'无法读取已授权的串口。');}
  },[api]);
  useEffect(()=>{
    void refresh();
    const onConnect=()=>void refresh();
    const onDisconnect=(event:Event)=>{
      if(event.target===connection.current.port){void connection.current.disconnect().catch(()=>{});setStatus('idle');setFeedback('设备已断开，不会自动重发。');}
      void refresh();
    };
    api?.addEventListener('connect',onConnect);api?.addEventListener('disconnect',onDisconnect);
    return ()=>{api?.removeEventListener('connect',onConnect);api?.removeEventListener('disconnect',onDisconnect);void connection.current.disconnect().catch(()=>{});};
  },[api,refresh]);
  const send=useCallback(async(message:SerialMessage)=>{
    if(!connection.current.port)throw new Error('串口未连接，没有发送数据。');
    if(statusRef.current==='sending'||statusRef.current==='closing')throw new Error('串口忙，本次未发送。');
    setStatus('sending');statusRef.current='sending';setError('');
    try{await connection.current.send(message);setFeedback(`已写入串口：${JSON.stringify(message.text)}。未确认设备执行。`);}
    catch(e){setError(e instanceof Error?e.message:'串口发送失败。');throw e;}
    finally{const next=connection.current.port?'connected':'idle';statusRef.current=next;setStatus(next);}
  },[]);
  async function choose() {
    if(!api)return;
    setError('');
    try{const port=await api.requestPort();const next=await api.getPorts();setPorts(next.includes(port)?next:[...next,port]);setSelected(port);}
    catch(e){if(e instanceof DOMException&&e.name==='NotFoundError'){setFeedback('未选择设备。');return;}setError(e instanceof Error?e.message:'无法选择串口。');}
  }
  async function connect(baudRate:number) {
    if(!selected)return;
    setStatus('opening');setError('');setFeedback('');
    try{await connection.current.connect(selected,baudRate);setStatus('connected');setFeedback('已连接。如设备因连接而重启，请待它就绪后再发送。');}
    catch(e){setStatus('idle');setError('连接失败：'+(e instanceof Error?e.message:String(e))+'。请检查设备是否被其他程序占用。');}
  }
  async function disconnect() {
    if(!connection.current.port&&statusRef.current!=='opening'){await connection.current.disconnect();return;}
    setStatus('closing');setError('');
    try{await connection.current.disconnect();setFeedback('串口已断开。');}
    catch(e){setError('关闭连接时出现错误：'+(e instanceof Error?e.message:String(e)));}
    finally{setStatus('idle');}
  }
  return {supported:!!api,ports,selected,setSelected,status,feedback,error,refresh,choose,connect,disconnect,send};
}
export type SerialOutput = ReturnType<typeof useSerialOutput>;
export function SerialPanel({output,message,baudRate,disabled,onMessage,onBaudRate,onTest}:{output:SerialOutput;message?:SerialMessage;baudRate:number;disabled:boolean;onMessage:(m:SerialMessage)=>void;onBaudRate:(n:number)=>void;onTest:()=>void}) {
  const m=message??DEFAULT_MESSAGE;
  const connected=output.status==='connected'||output.status==='sending';
  const busy=output.status==='opening'||output.status==='closing'||output.status==='sending';
  return <div className="serial-panel">
    {!output.supported&&<p className="serial-warning" role="status">此浏览器不提供 Web Serial。请在支持的桌面浏览器（如 Chrome）中打开当前地址；配置仍可保存。</p>}
    <label className="field compact">已授权串口<select aria-label="已授权串口" value={output.selected?String(output.ports.indexOf(output.selected)):''} disabled={!output.supported||connected||busy||disabled} onChange={e=>output.setSelected(output.ports[+e.target.value]??null)}><option value="" disabled>选择设备后显示在这里</option>{output.ports.map((p,i)=><option key={i} value={i}>{portLabel(p,i)}</option>)}</select></label>
    <div className="serial-buttons"><button className="secondary small" disabled={!output.supported||connected||busy||disabled} onClick={()=>void output.choose()}>选择设备</button><button className="text-button" disabled={!output.supported||busy||disabled} onClick={()=>void output.refresh()}>刷新列表</button></div>
    <label className="field compact">波特率<select aria-label="波特率" value={baudRate} disabled={connected||busy||disabled} onChange={e=>onBaudRate(+e.target.value)}>{BAUD_RATES.map(n=><option value={n} key={n}>{n}</option>)}</select></label>
    <div className="serial-connection"><span className="serial-state connection-label"><i className={`connection-dot ${connected?'connected':output.error?'failed':''}`}/>{output.status==='opening'?'正在连接':output.status==='closing'?'正在断开':output.status==='sending'?'正在发送':connected?'已连接':'未连接'}</span><button className="secondary small" disabled={!output.supported||busy||disabled||(!connected&&!output.selected)} onClick={()=>void(connected?output.disconnect():output.connect(baudRate))}>{connected?'断开':'连接'}</button></div>
    <label className="field compact">匹配成功时发送<input aria-label="串口发送内容" maxLength={512} value={m.text} disabled={disabled} onChange={e=>onMessage({...m,text:e.target.value})} placeholder="例如 /success、1 或 YES"/></label>
    <label className="field compact">结束符<select aria-label="串口结束符" value={m.lineEnding} disabled={disabled} onChange={e=>onMessage({...m,lineEnding:e.target.value as SerialMessage['lineEnding']} )}><option value="none">不追加</option><option value="lf">换行 LF（\n）</option><option value="crlf">回车换行 CRLF（\r\n）</option></select></label>
    <p>UTF-8 文本。一次完整动作只发送一次，不匹配时不发送。</p>
    <button className="secondary small serial-test" disabled={!connected||busy||disabled||!m.text.length} onClick={onTest}>测试发送</button>
    {output.feedback&&<p className="serial-feedback" role="status">{output.feedback}</p>}{output.error&&<p className="serial-warning" role="alert">{output.error}</p>}
  </div>;
}
