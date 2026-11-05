import {validateBroker,validateMqttMessage,type BrokerConfig,type MqttMessage} from './mqtt-output';
import {BAUD_RATES,type SerialMessage} from './serial';
export type ObjectProject={kind:'objects';version:1;name:string;provider:'openai'|'deepseek';model:string;label:string;description:string;interval:number;confirmations:number;effect:'indicator'|'serial'|'mqtt';yes:string;no:string;sendNo:boolean;baud:number;ending:SerialMessage['lineEnding'];broker?:BrokerConfig;mqtt:MqttMessage};
export const MODELS={openai:['gpt-4.1-mini','gpt-4o-mini'],deepseek:['deepseek-flash']};
export function newObjectProject(name:string):ObjectProject{return {kind:'objects',version:1,name,provider:'openai',model:'gpt-4.1-mini',label:'杯子',description:'',interval:3,confirmations:1,effect:'indicator',yes:'YES',no:'NO',sendNo:true,baud:115200,ending:'lf',mqtt:{topic:'project/action',payload:'YES',qos:0}};}
export function cleanObjectProject(raw:unknown):ObjectProject{
 const x=raw as ObjectProject;if(!x||x.kind!=='objects'||x.version!==1||!['openai','deepseek'].includes(x.provider)||!MODELS[x.provider].includes(x.model))throw new Error('不是支持的物体检测项目。');
 for(const [value,min,max] of [[x.name,1,80],[x.label,1,120],[x.description,0,400],[x.yes,1,512],[x.no,1,512]] as const)if(typeof value!=='string'||value.length<min||value.length>max||(min>0&&!value.trim()))throw new Error('项目名称、标签或输出内容无效。');
 if(!Number.isFinite(x.interval)||x.interval<1||x.interval>60||!Number.isInteger(x.confirmations)||x.confirmations<1||x.confirmations>5||!['indicator','serial','mqtt'].includes(x.effect)||!BAUD_RATES.includes(x.baud)||!['none','lf','crlf'].includes(x.ending)||typeof x.sendNo!=='boolean')throw new Error('检测或输出参数无效。');
 validateMqttMessage(x.mqtt);const broker=x.broker?validateBroker(x.broker):undefined;
 return {kind:'objects',version:1,name:x.name.trim(),provider:x.provider,model:x.model,label:x.label.trim(),description:x.description,interval:x.interval,confirmations:x.confirmations,effect:x.effect,yes:x.yes,no:x.no,sendNo:x.sendNo,baud:x.baud,ending:x.ending,broker:broker?{url:broker.url,username:broker.username,clientId:broker.clientId,passwordRequired:broker.passwordRequired}:undefined,mqtt:{topic:x.mqtt.topic,payload:x.mqtt.payload,qos:x.mqtt.qos}};
}
const STORAGE='motion-object-project';
export function loadObjectProject():ObjectProject|null{const raw=localStorage.getItem(STORAGE);return raw?cleanObjectProject(JSON.parse(raw)):null;}
export function saveObjectProject(p:ObjectProject){const clean=cleanObjectProject(p);localStorage.setItem(STORAGE,JSON.stringify(clean));return clean;}
export function deleteObjectProject(){localStorage.removeItem(STORAGE);}
export class PresenceGate{
 private committed:boolean|null=null;private candidate:boolean|null=null;private count=0;
 step(value:boolean,needed=1){if(this.candidate===value)this.count++;else{this.candidate=value;this.count=1;}if(this.count>=needed&&this.committed!==value){this.committed=value;return value;}return null;}
 reset(){this.committed=null;this.candidate=null;this.count=0;}
}
