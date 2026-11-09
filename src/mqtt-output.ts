export type BrokerConfig = {url:string;username:string;clientId:string;passwordRequired:boolean};
export type MqttMessage = {topic:string;payload:string;qos:0|1};
export const DEFAULT_MQTT_MESSAGE:MqttMessage={topic:'project/action',payload:'YES',qos:0};
export function validateBroker(config:BrokerConfig,securePage=false):BrokerConfig {
  let url:URL;try{url=new URL(config.url);}catch{throw new Error('请输入完整的 WebSocket 地址，如 wss://主机:端口/mqtt。');}
  if(!['ws:','wss:'].includes(url.protocol))throw new Error('网页 MQTT 需要 ws:// 或 wss://，不能使用普通 MQTT TCP 地址。');
  if(securePage&&url.protocol!=='wss:')throw new Error('HTTPS 页面需要使用 wss://。');
  if(url.username||url.password||url.search||url.hash)throw new Error('连接地址只填写主机、端口和路径；凭证使用独立输入框。');
  if(config.username.length>256||config.clientId.length>128)throw new Error('用户名或 Client ID 过长。');
  return {url:config.url.trim(),username:config.username,clientId:config.clientId,passwordRequired:config.passwordRequired};
}
export function validateMqttMessage(message:MqttMessage):void {
  if(typeof message.topic!=='string'||!message.topic.trim()||message.topic.length>512||/[+#\0]/.test(message.topic))throw new Error('Topic 不能为空，也不能包含发布通配符 +、# 或空字符。');
  if(typeof message.payload!=='string'||!message.payload.length||message.payload.length>512)throw new Error('消息内容需为 1–512 个字符。');
  if(message.qos!==0&&message.qos!==1)throw new Error('仅支持 QoS 0 或 1。');
}
export interface MqttPeer {
  connected:boolean;
  on(event:string,fn:(...args:any[])=>void):MqttPeer;
  connect():unknown;
  end(force:boolean):unknown;
  publish(topic:string,payload:string,options:{qos:0|1;retain:boolean},callback:(error?:Error)=>void):unknown;
}
type PeerFactory=(config:BrokerConfig,password:string)=>Promise<MqttPeer>;
export class MqttConnection {
  private peer:MqttPeer|null=null;
  private generation=0;
  private cancelOpen:(()=>void)|null=null;
  private cancelSend:(()=>void)|null=null;
  private sending=false;
  connected=false;
  constructor(private factory:PeerFactory=async(config,password)=>{
    const {default:mqtt}=await import('mqtt');
    return mqtt.connect(config.url,{manualConnect:true,username:config.username||undefined,password:password||undefined,clientId:config.clientId||`motion-${crypto.randomUUID().slice(0,12)}`,reconnectPeriod:0,connectTimeout:10000,queueQoSZero:false,clean:true,protocolVersion:4});
  }){}
  disconnect(){
    this.generation++;this.connected=false;
    const opening=this.cancelOpen;this.cancelOpen=null;opening?.();
    const sending=this.cancelSend;this.cancelSend=null;sending?.();
    const peer=this.peer;this.peer=null;peer?.end(true);
  }
  async connect(config:BrokerConfig,password:string,onState:(state:'connected'|'idle'|'error',message:string)=>void):Promise<void>{
    validateBroker(config);
    if(config.passwordRequired&&!password)throw new Error('请重新输入本次会话的 MQTT 密码并保存配置。');
    this.disconnect();const gen=this.generation;
    const peer=await this.factory(config,password);
    if(gen!==this.generation){peer.end(true);throw new Error('连接已取消。');}
    this.peer=peer;
    await new Promise<void>((resolve,reject)=>{
      let settled=false;let encounteredError=false;
      const fail=(message:string)=>{if(settled)return;settled=true;clearTimeout(timer);this.cancelOpen=null;this.connected=false;peer.end(true);reject(new Error(message));};
      const timer=setTimeout(()=>fail('MQTT 连接超时，请检查 WebSocket 地址、端口、路径和认证。'),12000);
      this.cancelOpen=()=>fail('连接已取消。');
      peer.on('connect',()=>{if(gen!==this.generation||settled)return;settled=true;clearTimeout(timer);this.cancelOpen=null;this.connected=true;onState('connected','MQTT 已连接。');resolve();});
      peer.on('error',(error:Error)=>{if(gen!==this.generation)return;encounteredError=true;this.connected=false;onState('error',error.message||'MQTT 连接错误。');fail(error.message||'MQTT 连接错误。');peer.end(true);});
      peer.on('close',()=>{if(gen!==this.generation)return;this.connected=false;this.cancelSend?.();if(!settled)fail('MQTT 连接已关闭。');else onState(encounteredError?'error':'idle',encounteredError?'MQTT 连接异常，请检查后重新连接。':'MQTT 连接已断开，不会自动重发。');});
      peer.connect();
    });
  }
  async send(message:MqttMessage):Promise<void>{
    validateMqttMessage(message);
    const peer=this.peer;
    if(!this.connected||!peer?.connected)throw new Error('MQTT 未连接，没有发送消息。');
    if(this.sending)throw new Error('上一条 MQTT 消息仍在发送，本次未发送。');
    this.sending=true;
    try{await new Promise<void>((resolve,reject)=>{
      let finished=false;
      const complete=(error?:Error)=>{if(finished)return;finished=true;clearTimeout(timer);this.cancelSend=null;error?reject(error):resolve();};
      const timer=setTimeout(()=>{complete(new Error('MQTT 发送超时，连接已关闭，不会自动重发。'));this.disconnect();},5000);
      this.cancelSend=()=>complete(new Error('MQTT 连接已断开，本次发送未确认。'));
      try{peer.publish(message.topic,message.payload,{qos:message.qos,retain:false},error=>complete(error));}catch(e){complete(e instanceof Error?e:new Error(String(e)));}
    });}finally{this.sending=false;}
  }
}
