import {t, messageT} from './i18n';
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
export function SerialPanel({coordinates=false,presence=false,continuous=false,output,message,baudRate,disabled,onMessage,onBaudRate,onTest}:{coordinates?:boolean;presence?:boolean;continuous?:boolean;output:SerialOutput;message?:SerialMessage;baudRate:number;disabled:boolean;onMessage:(m:SerialMessage)=>void;onBaudRate:(n:number)=>void;onTest:()=>void}) {
  const m=message??(continuous?{...DEFAULT_MESSAGE,text:'{value}'}:DEFAULT_MESSAGE);
  const connected=output.status==='connected'||output.status==='sending';
  const busy=output.status==='opening'||output.status==='closing'||output.status==='sending';
  return <div className="serial-panel">
    {!output.supported&&<p className="serial-warning" role="status">{t("此浏览器不提供 Web Serial。请在支持的桌面浏览器（如 Chrome）中打开当前地址；配置仍可保存。")}</p>}
    <label className="field compact">{t("已授权串口")}<select aria-label={t("已授权串口")} value={output.selected?String(output.ports.indexOf(output.selected)):''} disabled={!output.supported||connected||busy||disabled} onChange={e=>output.setSelected(output.ports[+e.target.value]??null)}><option value="" disabled>{t("选择设备后显示在这里")}</option>{output.ports.map((p,i)=><option key={i} value={i}>{portLabel(p,i)}</option>)}</select></label>
    <div className="serial-buttons"><button className="secondary small" disabled={!output.supported||connected||busy||disabled} onClick={()=>void output.choose()}>{t("选择设备")}</button><button className="text-button" disabled={!output.supported||busy||disabled} onClick={()=>void output.refresh()}>{t("刷新列表")}</button></div>
    <label className="field compact">{t("波特率")}<select aria-label={t("波特率")} value={baudRate} disabled={connected||busy||disabled} onChange={e=>onBaudRate(+e.target.value)}>{BAUD_RATES.map(n=><option value={n} key={n}>{n}</option>)}</select></label>
    <div className="serial-connection"><span className="serial-state connection-label"><i className={`connection-dot ${connected?'connected':output.error?'failed':''}`}/>{output.status==='opening'?t("正在连接"):output.status==='closing'?t("正在断开"):output.status==='sending'?t("正在发送"):connected?t("已连接"):t("未连接")}</span><button className="secondary small" disabled={!output.supported||busy||disabled||(!connected&&!output.selected)} onClick={()=>void(connected?output.disconnect():output.connect(baudRate))}>{connected?t("断开"):t("连接")}</button></div>
    {!coordinates&&<label className="field compact">{continuous?t("数值消息（可使用 {value}）"):presence?t("YES 时发送"):t("匹配成功时发送")}<input aria-label={t("串口发送内容")} maxLength={512} value={m.text} disabled={disabled} onChange={e=>onMessage({...m,text:e.target.value})} placeholder={t("例如 /success、1 或 YES")}/></label>}
    <label className="field compact">{t("结束符")}<select aria-label={t("串口结束符")} value={m.lineEnding} disabled={disabled||coordinates} onChange={e=>onMessage({...m,lineEnding:e.target.value as SerialMessage['lineEnding']} )}><option value="none">{t("不追加")}</option><option value="lf">{t("换行 LF（\\n）")}</option><option value="crlf">{t("回车换行 CRLF（\\r\\n）")}</option></select></label>
    {continuous&&!m.text.includes('{value}')&&<p>{t("未填写 {value} 时发送纯数值，忽略此处文字。")}</p>}
    <p>{coordinates?t("每行发送一帧 JSON，接收端按换行拆分消息。"):continuous?t("连续数值输出；追踪丢失时不发送，停止后不补发。"):presence?t("UTF-8 文本。确认结果首次出现或变化时发送；NO 可选择不发送。"):t("UTF-8 文本。每次确认只发送一次，未触发时不发送。")}</p>
    <div className="serial-actions"><button className="secondary small serial-test" disabled={!connected||busy||disabled||!m.text.length} onClick={onTest}>{t("测试发送")}</button><a className="secondary small" href={`${import.meta.env?.BASE_URL??'/'}examples/${coordinates?'coordinate_receivers.zip':continuous?'serial_numeric_receiver.ino':'serial_success_led.ino'}`} download>{t("案例代码下载")}</a></div><p className="serial-example-note">{t(coordinates?"坐标案例：115200 · JSON · LF":continuous?"Serial 数值案例：115200 · {value} · LF":"案例：115200 · /success · LF")}</p>
    {output.feedback&&<p className="serial-feedback" role="status">{messageT(output.feedback)}</p>}{output.error&&<p className="serial-warning" role="alert">{messageT(output.error)}</p>}
  </div>;
}
