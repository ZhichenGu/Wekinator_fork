import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_MQTT_MESSAGE, MqttConnection, validateBroker, validateMqttMessage, type BrokerConfig, type MqttMessage } from './mqtt-output';
export function useMqttOutput(){
  const connection=useRef(new MqttConnection());
  const [state,setState]=useState<'idle'|'connecting'|'connected'|'error'>('idle');
  const [message,setMessage]=useState('');const [password,setPassword]=useState('');
  const [sending,setSending]=useState(false);
  useEffect(()=>()=>connection.current.disconnect(),[]);
  const disconnect=useCallback(()=>{connection.current.disconnect();setState('idle');setMessage('MQTT 已断开。');},[]);
  const reset=useCallback(()=>{connection.current.disconnect();setState('idle');setPassword('');setMessage('');},[]);
  async function connect(config:BrokerConfig){
    setState('connecting');setMessage('');
    try{await connection.current.connect(config,password,(s,m)=>{setState(s);setMessage(m);});}
    catch(e){setState('error');setMessage(e instanceof Error?e.message:'MQTT 连接失败。');}
  }
  const send=useCallback(async(value:MqttMessage)=>{
    setSending(true);
    try{await connection.current.send(value);setMessage(value.qos===1?'Broker 已确认接收。尚未确认设备执行。':'消息已提交发送。尚未确认 Broker 或设备接收。');}
    catch(e){setMessage(e instanceof Error?e.message:'MQTT 发送失败。');throw e;}
    finally{setSending(false);}
  },[]);
  return {state,message,password,setPassword,sending,disconnect,reset,connect,send};
}
export type MqttOutput=ReturnType<typeof useMqttOutput>;
const EMPTY:BrokerConfig={url:'',username:'',clientId:'',passwordRequired:false};
export function MqttPanel({presence=false,output,config,value,actionId,disabled,onSave,onTest,onDirtyChange}:{presence?:boolean;output:MqttOutput;config?:BrokerConfig;value?:MqttMessage;actionId:string;disabled:boolean;onSave:(config:BrokerConfig,message:MqttMessage)=>void;onTest:()=>void;onDirtyChange:(dirty:boolean)=>void}){
  const [draft,setDraft]=useState(config??EMPTY);const [secret,setSecret]=useState(output.password);
  const [payload,setPayload]=useState(value??DEFAULT_MQTT_MESSAGE);const [dirty,setDirty]=useState(!config);const [error,setError]=useState('');
  useEffect(()=>{setDraft(config??EMPTY);setSecret(output.password);setPayload(value??DEFAULT_MQTT_MESSAGE);setDirty(!config);},[actionId,config?.url,config?.username,config?.clientId,value?.topic,value?.payload,value?.qos]);
  useEffect(()=>{onDirtyChange(dirty);return ()=>onDirtyChange(false);},[dirty,onDirtyChange]);
  const connected=output.state==='connected',busy=output.state==='connecting'||output.sending;
  function save(){try{const parsed=validateBroker({...draft,passwordRequired:!!secret},location.protocol==='https:');validateMqttMessage(payload);output.setPassword(secret);onSave(parsed,payload);setDraft(parsed);setDirty(false);setError('');}catch(e){setError(e instanceof Error?e.message:String(e));}}
  return <div className="mqtt-panel">
    <label className="field compact">Broker WebSocket URL<input aria-label="MQTT WebSocket URL" value={draft.url} disabled={disabled||connected||busy} placeholder="wss://主机:端口/mqtt" onChange={e=>{setDraft(d=>({...d,url:e.target.value}));setDirty(true);}}/></label>
    <p>端口包含在 URL 中，路径以 Broker 配置为准。</p>
    <label className="field compact">Username（可选）<input aria-label="MQTT Username" autoComplete="off" value={draft.username} disabled={disabled||connected||busy} onChange={e=>{setDraft(d=>({...d,username:e.target.value}));setDirty(true);}}/></label>
    <label className="field compact">Password（仅本次会话）<input aria-label="MQTT Password" type="password" autoComplete="new-password" value={secret} disabled={disabled||connected||busy} onChange={e=>{setSecret(e.target.value);setDirty(true);}}/></label>
    <details><summary>Client ID（可选）</summary><input aria-label="MQTT Client ID" value={draft.clientId} disabled={disabled||connected||busy} onChange={e=>{setDraft(d=>({...d,clientId:e.target.value}));setDirty(true);}}/></details>
    <label className="field compact">Topic<input aria-label="MQTT Topic" value={payload.topic} disabled={disabled||busy} onChange={e=>{setPayload(p=>({...p,topic:e.target.value}));setDirty(true);}}/></label>
    <label className="field compact">{presence?'YES 时发送':'匹配成功时发送'}<input aria-label="MQTT 消息内容" maxLength={512} value={payload.payload} disabled={disabled||busy} onChange={e=>{setPayload(p=>({...p,payload:e.target.value}));setDirty(true);}}/></label>
    <label className="field compact">QoS<select aria-label="MQTT QoS" value={payload.qos} disabled={disabled||busy} onChange={e=>{setPayload(p=>({...p,qos:+e.target.value as 0|1}));setDirty(true);}}><option value="0">0 · 不等待 Broker 确认</option><option value="1">1 · 等待 Broker 确认</option></select></label>
    <div className="serial-buttons"><button className="secondary small" disabled={disabled||busy||!dirty} onClick={save}>保存配置</button><span className="config-state">{dirty?'有未保存修改':'配置已保存'}</span></div>
    <div className="serial-connection"><span className="connection-label"><i className={`connection-dot ${connected?'connected':output.state==='error'?'failed':''}`}/>{connected?'已连接':output.state==='connecting'?'正在连接':output.state==='error'?'连接异常':'未连接'}</span><button className="secondary small" disabled={disabled||busy||(!connected&&(dirty||!config||config.passwordRequired&&!output.password))} onClick={()=>connected?output.disconnect():config&&void output.connect(config)}>{connected?'断开':'连接'}</button></div>
    {config?.passwordRequired&&!output.password&&<p>请重新输入密码并保存配置。密码不会写入项目文件。</p>}
    <div className="serial-actions"><button className="secondary small serial-test" disabled={disabled||busy||dirty||!connected} onClick={onTest}>测试发送</button><a className="secondary small" href={`${import.meta.env.BASE_URL}examples/esp32s3_mqtt_led.ino`} download="esp32s3_mqtt_led.ino">案例代码下载</a></div><p>案例：ESP32-S3 · project/action · YES。Wi-Fi 和 MQTT 配置在 .ino 中填写。</p>
    <p>只在触发时发送，不发送保留消息；断线不自动补发。</p>
    {(error||output.message)&&<p role="status" className="serial-feedback">{error||output.message}</p>}
  </div>;
}
