import {validDetectionRegion,type DetectionRegion} from './detection-region';
import {withProjectId,upsertProject,projectName} from './catalog';
import {t} from './i18n';
import {validateBroker,validateMqttMessage,type BrokerConfig,type MqttMessage} from './mqtt-output';
import {BAUD_RATES,type SerialMessage} from './serial';
export type ObjectProject={kind:'objects';version:1;id?:string;maxRequests?:number;region?:DetectionRegion;name:string;task?:'presence'|'count'|'condition';minCount?:number;provider:'openai'|'deepseek';model:string;label:string;description:string;interval:number;confirmations:number;effect:'indicator'|'serial'|'mqtt';yes:string;no:string;sendNo:boolean;baud:number;ending:SerialMessage['lineEnding'];broker?:BrokerConfig;mqtt:MqttMessage};
export const MODELS={openai:['gpt-4.1-mini','gpt-4o-mini'],deepseek:['deepseek-flash']};
export function newObjectProject(name:string,task:NonNullable<ObjectProject['task']>='presence'):ObjectProject{return {kind:'objects',version:1,id:crypto.randomUUID(),maxRequests:30,name,task,provider:'deepseek',model:'deepseek-flash',label:t(task==='condition'?'杯子是否倒放在桌面上':task==='count'?'人':'杯子'),description:task==='condition'?t('杯口朝下接触桌面，杯底朝上。正常直立不满足条件。'):'',interval:3,confirmations:1,effect:'indicator',yes:'YES',no:'NO',sendNo:true,baud:115200,ending:'lf',mqtt:{topic:'project/action',payload:'YES',qos:0}};}
export function cleanObjectProject(raw:unknown):ObjectProject{
 const x=raw as ObjectProject;if(!x||x.kind!=='objects'||x.version!==1||!['openai','deepseek'].includes(x.provider)||!MODELS[x.provider].includes(x.model))throw new Error('不是支持的物体检测项目。');
 for(const [value,min,max] of [[x.name,1,80],[x.label,1,120],[x.description,0,400],[x.yes,1,512],[x.no,1,512]] as const)if(typeof value!=='string'||value.length<min||value.length>max||(min>0&&!value.trim()))throw new Error('项目名称、标签或输出内容无效。');
 if(!Number.isFinite(x.interval)||x.interval<1||x.interval>60||!Number.isInteger(x.confirmations)||x.confirmations<1||x.confirmations>5||!['indicator','serial','mqtt'].includes(x.effect)||!BAUD_RATES.includes(x.baud)||!['none','lf','crlf'].includes(x.ending)||typeof x.sendNo!=='boolean')throw new Error('检测或输出参数无效。');
 if(x.id!==undefined&&(typeof x.id!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(x.id)))throw new Error('项目标识无效。');
 if(x.maxRequests!==undefined&&(!Number.isInteger(x.maxRequests)||x.maxRequests<1||x.maxRequests>1000))throw new Error('本轮请求上限需为 1–1000 的整数。');
 if(x.task!==undefined&&!['presence','count','condition'].includes(x.task))throw new Error('无效的视觉任务。');
 if(x.minCount!==undefined&&(!Number.isInteger(x.minCount)||x.minCount<1||x.minCount>1000))throw new Error('数量阈值无效。');
 if(x.region!==undefined&&!validDetectionRegion(x.region))throw new Error('检测区域无效。');
 validateMqttMessage(x.mqtt);const broker=x.broker?validateBroker(x.broker):undefined;
 return {kind:'objects',version:1,id:x.id,region:x.region?{x:x.region.x,y:x.region.y,width:x.region.width,height:x.region.height}:undefined,maxRequests:x.maxRequests??30,name:x.name.trim(),task:x.task??'presence',minCount:x.minCount??1,provider:x.provider,model:x.model,label:x.label.trim(),description:x.description,interval:x.interval,confirmations:x.confirmations,effect:x.effect,yes:x.yes,no:x.no,sendNo:x.sendNo,baud:x.baud,ending:x.ending,broker:broker?{url:broker.url,username:broker.username,clientId:broker.clientId,passwordRequired:broker.passwordRequired}:undefined,mqtt:{topic:x.mqtt.topic,payload:x.mqtt.payload,qos:x.mqtt.qos}};
}
const STORAGE='motion-object-project';const LIBRARY='motion-object-projects';
function readLibrary():ObjectProject[]{const raw=localStorage.getItem(LIBRARY);if(raw){const parsed=JSON.parse(raw);if(parsed.version!==1||!Array.isArray(parsed.projects))throw new Error('项目列表读取失败。');return parsed.projects.map((p:unknown)=>withProjectId(cleanObjectProject(p)));}const legacy=localStorage.getItem(STORAGE);if(!legacy)return [];const migrated=withProjectId(cleanObjectProject(JSON.parse(legacy)));writeLibrary([migrated]);localStorage.removeItem(STORAGE);return [migrated];}
function writeLibrary(projects:ObjectProject[]){localStorage.setItem(LIBRARY,JSON.stringify({version:1,projects:projects.map(cleanObjectProject)}));}
export function listObjectProjects(){return readLibrary();}
export function loadObjectProject():ObjectProject|null{return readLibrary()[0]??null;}
export function saveObjectProject(p:ObjectProject){const clean=withProjectId(cleanObjectProject(p));writeLibrary(upsertProject(readLibrary(),clean));return clean;}
export function deleteObjectProject(id?:string){const items=readLibrary(),target=id??items[0]?.id;writeLibrary(items.filter(p=>p.id!==target));}
export function renameObjectProject(id:string,name:string){const project=readLibrary().find(p=>p.id===id);if(!project)throw new Error('项目不存在。');return saveObjectProject({...project,name:projectName(name)});}
export class PresenceGate{
 private committed:boolean|null=null;private candidate:boolean|null=null;private count=0;
 step(value:boolean,needed=1){if(this.candidate===value)this.count++;else{this.candidate=value;this.count=1;}if(this.count>=needed&&this.committed!==value){this.committed=value;return value;}return null;}
 progress(needed=1){return {value:this.candidate,count:Math.min(this.count,needed),needed,confirmed:this.count>=needed};}
 reset(){this.committed=null;this.candidate=null;this.count=0;}
}
