import {HistoryList} from './HistoryList';
import {CameraRecordingKeys} from './CameraRecordingKeys';
import {LabPanel} from './LabPanel';
import {labEnabled,buildLabTemplates,LAB_DEFAULTS} from './lab-motion';
import {FloatingPreview,SettingFold} from './WorkspacePreview';
import {LearnLinks,LearnPage} from './Learn';
import type {GuideId} from './learn-content';
import {AudioStudio} from './AudioStudio';
import {audioTitle,newAudioProject,listAudioProjects,saveAudioProject,deleteAudioProject,cleanAudioProject,type AudioProject} from './audio';
import {DEFAULT_RELATION,relationValue,defaultRelationPoints,selectRelationPoint,relationFrame,relationDistance} from './relation';
import {RelationControls} from './RelationControls';
import {DwellGate,DEFAULT_REGION,regionPoint} from './region';
import {RegionControls} from './RegionControls';
import {OutputChoices} from './OutputChoices';
import {CreateChoices,type InputCategory} from './CreateChoices';
import {buildAnchors,ContinuousController,valueMessage} from './continuous';
import {withProjectId} from './catalog';
import {ProjectLibrary,RenameProjectDialog} from './ProjectLibrary';
import {SampleEditor} from './SampleEditor';
import {recordingKeyTarget,recordingShortcut,trimActionSample} from './trim';
import {LanguageSwitch,useLanguage} from './LanguageSwitch';
import {t, messageT} from './i18n';
import {recordingQuality} from './recording';
import {RecordingControls} from './RecordingControls';
import {ObjectStudio} from './ObjectStudio';
import {loadObjectProject,listObjectProjects,renameObjectProject,deleteObjectProject,newObjectProject,cleanObjectProject,type ObjectProject} from './objects';
import {Skeleton} from './Skeleton';
import {PointPicker} from './PointPicker';
import {ActionItem} from './ActionItem';
import {FeatureChoices} from './FeatureChoices';
import {FocusControls} from './FocusControls';
import {changeFocus,focusedFrame,frameBlend,recommendedPoints} from './focus';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Camera, Hand, ScanFace, PersonStanding, Plus, Play, Square, Circle, ArrowRight, ArrowLeft, Download, FolderOpen, Check, Layers, Sparkles, Settings2, Trash2, Video, X, ChevronRight, RotateCcw, Activity, AlertCircle, Pencil, Github } from 'lucide-react';
import { appendSample, MAX_SAMPLES_PER_ACTION, buildTemplates, energy, extract, sequence, validateProject, type Action, type Frame, type Mode, type Project, type Sample, type Point } from './core';
import { deleteProject, listProjects, loadProject, saveProject } from './storage';
import { containBox } from './preview';
import { SerialPanel, useSerialOutput } from './SerialPanel';
import { DEFAULT_MESSAGE } from './serial';
import { ConfirmDelete } from './ConfirmDelete';
import { DecimalInput } from './DecimalInput';
import { MqttPanel, useMqttOutput } from './MqttPanel';
import { DEFAULT_MQTT_MESSAGE } from './mqtt-output';
import { PREVIEW_VERSION } from './release';
import { buildPosePrototypes, learningMode, poseQuality, Recognizer, type RecognitionResult, type LearningMode } from './learning';
import { EvaluationPanel } from './EvaluationPanel';
import type { EvaluationReport } from './evaluation';
import './style.css';

const MODES = {
  hand: {name:'手部追踪',icon:Hand,description:'追踪手指关节与整只手的运动。适合捏合、展开手指、画圈等动作。',hint:'将一只手完整放入画面，保持手指清晰可见。'},
  face: {name:'面部追踪',icon:ScanFace,description:'追踪面部关键点与表情变化。适合张嘴、眨眼与连续表情。',hint:'正对摄像头，保持面部完整可见，避免过暗的环境。'},
  pose: {name:'身体追踪',icon:PersonStanding,description:'追踪身体关节与运动轨迹。适合抬手、伸展与全身动作。',hint:'后退一些，让肩、髋、手腕和脚踝都进入画面。'},
};
const COLORS=['#dddddd','#bcbcbc','#969696','#737373','#474747'];
const uid=()=>crypto.randomUUID();
const makeAction=(index=0,existing:string[]=[]):Action=>{while(existing.includes(t('动作 {0}',String.fromCharCode(65+index))))index++;return ({id:uid(),name:t('动作 {0}',String.fromCharCode(65+index)),effect:'indicator',color:COLORS[index%COLORS.length],samples:[],trained:false,threshold:.7});};
function App() {
  const language=useLanguage();
  const [page,setPage]=useState<'home'|'create'|'studio'|'objects'|'audio'|'learn'>('home');
  const [project,setProject]=useState<Project|null>(null);
  const projectRef=useRef<Project|null>(null); projectRef.current=project;
  const [visualTask,setVisualTask]=useState<'presence'|'count'|'condition'>('presence');
  const [audioTask,setAudioTask]=useState<'keyword'|'event'|'volume'>('keyword');
  const [guideId,setGuideId]=useState<GuideId>('serial');
  const [inputCategory,setInputCategory]=useState<InputCategory|null>(null);
  const [audioProject,setAudioProject]=useState<AudioProject|null>(null);
  const [audioProjects,setAudioProjects]=useState<AudioProject[]>([]);
  const [objectProject,setObjectProject]=useState<ObjectProject|null>(null);
  const [recentObject,setRecentObject]=useState<ObjectProject|null>(null);
  const [trackingProjects,setTrackingProjects]=useState<Project[]>([]),[objectProjects,setObjectProjects]=useState<ObjectProject[]>([]);
  const [renaming,setRenaming]=useState<{kind:'tracking'|'objects'|'audio';id:string;name:string}|null>(null);
  const shortcut=useRef<((e:KeyboardEvent)=>void)|null>(null);
  useEffect(()=>{const handler=(e:KeyboardEvent)=>shortcut.current?.(e);window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);},[]);
  function refreshObjects(){const items=listObjectProjects();setObjectProjects(items);setRecentObject(items[0]??null);}
  async function refreshTracking(){const items=await listProjects();setTrackingProjects(items);setRecent(items[0]??null);}
  useEffect(()=>{if(page==='home'){try{setAudioProjects(listAudioProjects());}catch{setNotice('项目列表读取失败。');}void refreshTracking().catch(()=>setNotice('项目列表读取失败。'));try{refreshObjects();}catch{setNotice('项目列表读取失败。');}}},[page]);
  useEffect(()=>{try{setRecentObject(loadObjectProject());}catch{setNotice('物体检测项目读取失败，可重新导入。');}},[]);
  const [recent,setRecent]=useState<Project|null>(null);
  const [customName,setCustomName]=useState<string|null>(null);const name=customName??t('项目 01'); const [mode,setMode]=useState<Mode>('hand');
  const [learning,setLearning]=useState<LearningMode>('dynamic');
  const [selected,setSelected]=useState('');
  const [camera,setCamera]=useState<'off'|'loading'|'on'>('off');
  const [frame,setFrame]=useState<Frame|null>(null); const [previewPoints,setPreviewPoints]=useState<Point[]>([]); const [ms,setMs]=useState(0);
  const [notice,setNotice]=useState(''); const [saved,setSaved]=useState('尚未保存');
  useEffect(()=>{if(!notice)return;const timer=window.setTimeout(()=>setNotice(''),1500);return()=>window.clearTimeout(timer);},[notice]);
  const [recording,setRecording]=useState(false); const [countdown,setCountdown]=useState<number|null>(null);
  const [recordProgress,setRecordProgress]=useState(0); const [duration,setDuration]=useState(3);
  const [running,setRunning]=useState(false); const runningRef=useRef(false);
  const [scores,setScores]=useState<Record<string,number>>({}); const [locked,setLocked]=useState(false);
  const [tab,setTab]=useState<'samples'|'run'|'test'>('samples'); const [negative,setNegative]=useState(false);
  const [captureSplit,setCaptureSplit]=useState<'train'|'test'>('train');
  const [recognitionStatus,setRecognitionStatus]=useState('未运行');
  const [poseLabelId,setPoseLabelId]=useState<string|null>(null);
  const recognizer=useRef<Recognizer|null>(null);
  const evaluationWorker=useRef<Worker|null>(null);
  const [evaluating,setEvaluating]=useState(false);
  const [report,setReport]=useState<EvaluationReport|null>(null);
  const [evaluationProgress,setEvaluationProgress]=useState({done:0,total:0});
  useEffect(()=>setReport(null),[project]);
  const [replay,setReplay]=useState<Sample|null>(null); const [replayIndex,setReplayIndex]=useState(0);
  const [logs,setLogs]=useState<{name:string;time:string;manual:boolean;result?:string}[]>([]);
  const [signal,setSignal]=useState<{id:string;result:'matched'|'sent'|'failed'}|null>(null);
  const signalTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [fallback,setFallback]=useState(false);
  const serial=useSerialOutput();
  const mqtt=useMqttOutput();
  const [mqttDirty,setMqttDirty]=useState(false);
  const [deletion,setDeletion]=useState<{kind:'project'|'action'|'sample';name:string;id?:string;actionId?:string}|null>(null);
  const [deleting,setDeleting]=useState(false);
  const saveTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const stageRef=useRef<HTMLDivElement>(null);
  const [stageSize,setStageSize]=useState({width:640,height:360});
  const [sourceSize,setSourceSize]=useState({width:640,height:480});
  const cameraBox=containBox(stageSize.width,stageSize.height,sourceSize.width,sourceSize.height);
  useEffect(()=>{
    if(page!=='studio'||!stageRef.current)return;
    const observer=new ResizeObserver(entries=>{const r=entries[0].contentRect;setStageSize({width:r.width,height:r.height});});
    observer.observe(stageRef.current);return ()=>observer.disconnect();
  },[page]);
  const videoRef=useRef<HTMLVideoElement>(null); const fileRef=useRef<HTMLInputElement>(null);
  const workerRef=useRef<Worker|null>(null); const streamRef=useRef<MediaStream|null>(null);
  const recordStopTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const rafRef=useRef(0); const timerRef=useRef<ReturnType<typeof setInterval>|null>(null);
  const generation=useRef(0); const busy=useRef(false);
  const smooth=useRef<Frame|null>(null);
  const recorder=useRef<{target:string;negative:boolean;split:'train'|'test';frames:Frame[];start:number;duration:number}|null>(null);
  const mainDetector=useRef<{detect:(image:HTMLVideoElement,t:number)=>{frame:Frame|null;points:Point[]};close:()=>void}|null>(null);
  const action=project?.actions.find(a=>a.id===selected);
  const continuous=useRef<ContinuousController|null>(null),continuousSend=useRef<((v:number)=>void)|null>(null),continuousBusy=useRef(false),continuousEpoch=useRef(0),lastFrameAt=useRef(0);
  const [continuousValue,setContinuousValue]=useState<number|null>(null);
  const [pointSlot,setPointSlot]=useState<0|1>(0);
  const dwell=useRef(new DwellGate());const [dwellProgress,setDwellProgress]=useState(0);
  const isRelation=project?.learning==='relation';
  const isRegion=project?.learning==='region'||isRelation;
  const ruleTargetVisible=!!project&&(isRelation?relationValue(project.mode,relationFrame(project.mode,previewPoints),project.relation??DEFAULT_RELATION)!==null:!!regionPoint(project.mode,previewPoints,project.region??DEFAULT_REGION));
  const isContinuous=project?.learning==='continuous';
  const cameraLayout=page==='studio';
  const [denseFace,setDenseFace]=useState(false);
  const [pinnedPreview,setPinnedPreview]=useState(false);
  const isPose=project?['pose','continuous'].includes(learningMode(project)):false;

  useEffect(()=>{window.scrollTo(0,0);},[page,guideId]);
  useEffect(()=>{loadProject().then(p=>{if(p)setRecent(validateProject(p));void refreshTracking();}).catch(()=>setNotice('本地存储暂不可用，仍可通过导出保存项目。'));return ()=>{generation.current++;streamRef.current?.getTracks().forEach(t=>t.stop());workerRef.current?.terminate();mainDetector.current?.close();cancelAnimationFrame(rafRef.current);if(timerRef.current)clearInterval(timerRef.current);if(recordStopTimer.current)clearTimeout(recordStopTimer.current);if(signalTimer.current)clearTimeout(signalTimer.current);evaluationWorker.current?.terminate();};},[]);
  useEffect(()=>{
    if(!project)return;
    setSaved('保存中…');
    const timer=setTimeout(()=>{saveProject(project).then(()=>{setSaved('已保存在此浏览器');setRecent(project);void refreshTracking();}).catch(()=>setSaved('本地保存失败，请导出项目'));},350);
    saveTimer.current=timer;
    return ()=>clearTimeout(timer);
  },[project]);
  function openCreate(category:InputCategory|null=null){setNotice('');setInputCategory(category);setPage('create');}
  function update(fn:(p:Project)=>Project) {setProject(p=>p?{...fn(p),updatedAt:new Date().toISOString()}:p);}
  function changeDuration(value:number) {setDuration(value);update(p=>({...p,recordingDuration:value}));}
  function editAction(fn:(a:Action)=>Action) {update(p=>({...p,actions:p.actions.map(a=>a.id===selected?fn(a):a)}));}
  function stopRun() {dwell.current=new DwellGate();setDwellProgress(0);continuousEpoch.current++;continuous.current=null;continuousSend.current=null;setContinuousValue(null);runningRef.current=false;setRunning(false);setLocked(false);recognizer.current=null;setScores({});setPoseLabelId(null);setRecognitionStatus('未运行');}
  function stopCamera() {setPinnedPreview(false);
    generation.current++;cancelAnimationFrame(rafRef.current);workerRef.current?.terminate();workerRef.current=null;
    mainDetector.current?.close();mainDetector.current=null;streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;
    if(videoRef.current)videoRef.current.srcObject=null;
    if(timerRef.current)clearInterval(timerRef.current);if(recordStopTimer.current)clearTimeout(recordStopTimer.current);
    recorder.current=null;setRecording(false);setCountdown(null);setCamera('off');setFrame(null);setPreviewPoints([]);smooth.current=null;busy.current=false;stopRun();
  }
  function enter(p:Project) {if((p.learning??'dynamic')==='dynamic'&&p.lab===undefined&&!p.labBaseline)p={...p,lab:{...LAB_DEFAULTS},actions:p.actions.map(a=>({...a,trained:false}))};p=withProjectId({...p,updatedAt:new Date().toISOString()});cancelEvaluation();setReport(null);setCaptureSplit('train');setNegative(false);setTab('samples');stopCamera();void serial.disconnect();mqtt.reset();setSourceSize({width:640,height:480});setDuration(p.recordingDuration??3);p={...p,actions:p.actions.map((a,i)=>({...a,color:['#bdf1c9','#bcd7ff','#f4c5af','#d5c6ff','#f3df9c'].includes(a.color)?COLORS[i%COLORS.length]:a.color}))};setProject(p);setSelected(p.actions[0]?.id??'');setMode(p.mode);setPage('studio');setNotice('');setLogs([]);setSignal(null);}
  function recordEvent(a:Action,manual:boolean,result?:string) {setLogs(l=>[{name:a.name,time:new Date().toLocaleTimeString(language==='zh'?'zh-CN':'en-US',{hour12:false}),manual,result},...l].slice(0,6));}
  function showSignal(a:Action,result:'matched'|'sent'|'failed'){if(signalTimer.current)clearTimeout(signalTimer.current);setSignal({id:a.id,result});signalTimer.current=setTimeout(()=>setSignal(null),900);}
  function execute(a:Action,manual=false) {if(projectRef.current?.learning==='continuous'){const value=a.controlValue??0;a={...a,serial:{...a.serial??DEFAULT_MESSAGE,text:valueMessage(a.serial?.text??'',value)},mqtt:{...a.mqtt??DEFAULT_MQTT_MESSAGE,payload:valueMessage(a.mqtt?.payload??'',value)}};}
    showSignal(a,'matched');
    if(a.effect==='serial'){
      void serial.send(a.serial??DEFAULT_MESSAGE).then(()=>{showSignal(a,'sent');recordEvent(a,manual,'串口已写入');}).catch(e=>{showSignal(a,'failed');setNotice(e instanceof Error?e.message:'串口发送失败。');recordEvent(a,manual,'串口未发送');});return;
    }
    if(a.effect==='mqtt'){void mqtt.send(a.mqtt??DEFAULT_MQTT_MESSAGE).then(()=>{showSignal(a,'sent');recordEvent(a,manual,'MQTT 已提交');}).catch(e=>{showSignal(a,'failed');setNotice(e instanceof Error?e.message:'MQTT 发送失败。');recordEvent(a,manual,'MQTT 未发送');});return;}
    recordEvent(a,manual);
  }
  function requestDelete(value:NonNullable<typeof deletion>) {cancelEvaluation();stopRun();setDeletion(value);}
  async function confirmDelete() {
    if(!deletion)return;
    if(deletion.id?.startsWith('audio:')){try{deleteAudioProject(deletion.id.slice(6));setAudioProjects(listAudioProjects());setDeletion(null);}catch{setNotice('声音项目删除失败。');}return;}
    if(deletion.id?.startsWith('object:')){try{deleteObjectProject(deletion.id.slice(7));refreshObjects();setDeletion(null);}catch{setNotice('物体检测项目删除失败。');}return;}
    if(deletion.kind==='project'){
      setDeleting(true);const target=deletion.id??projectRef.current?.id;const current=projectRef.current;const isCurrent=current?.id===target;
      if(isCurrent){if(saveTimer.current)clearTimeout(saveTimer.current);setProject(null);stopCamera();void serial.disconnect();mqtt.reset();}
      try{await deleteProject(target);await refreshTracking();if(isCurrent)setPage('home');setDeletion(null);setNotice('项目已从本地移除，已导出的项目文件不受影响。');}
      catch(e){if(isCurrent)setProject(current);setNotice('删除失败：'+(e instanceof Error?e.message:String(e)));}
      finally{setDeleting(false);}
    }else if(deletion.kind==='action'){
      const remaining=projectRef.current?.actions.filter(a=>a.id!==deletion.id)??[];
      update(p=>({...p,actions:remaining}));if(selected===deletion.id)setSelected(remaining[0]?.id??'');setDeletion(null);setScores({});setNotice('动作已删除，其他动作已保留。');
    }else{
      update(p=>({...p,actions:p.actions.map(a=>a.id===deletion.actionId?{...a,trained:a.samples.find(s=>s.id===deletion.id)?.split==='test'?a.trained:false,samples:a.samples.filter(s=>s.id!==deletion.id)}:a)}));setDeletion(null);setNotice('录制已删除。删除训练数据后需要重新训练。');
    }
  }
  function applyRecognition(result:RecognitionResult) {
    setScores(result.scores);setLocked(result.locked);setPoseLabelId(result.state==='recognized'?result.labelId:null);
    const label=projectRef.current?.actions.find(a=>a.id===result.labelId)?.name??'';
    const text=result.state==='lost'?'追踪丢失 · 暂停触发':result.state==='unknown'?'未知或不确定的姿态':result.state==='confirming'?`稳定确认中：${label}`:result.state==='recognized'?`当前姿态：${label}`:result.state==='locked'?'已触发 · 等待动作退出后复位':'等待完整动作';
    setRecognitionStatus(text);
    if(result.eventId){const a=projectRef.current?.actions.find(a=>a.id===result.eventId);if(a)execute(a);}
  }
  function setFocus(ids:number[]|undefined){
    if(!project||inProgress||running||ids?.length===0)return;
    try{const next=changeFocus(project,ids);if(project.mode==='face'&&ids?.length===478)setDenseFace(true);stopRun();cancelEvaluation();setReport(null);smooth.current=null;setFrame(null);update(()=>next);if(project.actions.some(a=>a.samples.length))setNotice('关注部位已更改，请重新训练。');}catch(e){setNotice((e as Error).message);}
  }
  function choosePoint(id:number) {
    const p=projectRef.current;if(!p)return;if(!['region','relation'].includes(p.learning??'')){if(inProgress||running)return;const ids=p.focus??recommendedPoints(p.mode);setFocus(ids.includes(id)?ids.filter(i=>i!==id):[...ids,id].sort((a,b)=>a-b));return;}
    stopRun();setRecognitionStatus('未运行');
    if(p.learning==='region')update(v=>({...v,region:{...(v.region??DEFAULT_REGION),point:id}}));
    else {const config=p.relation??DEFAULT_RELATION;update(v=>({...v,relation:{...config,points:selectRelationPoint(config.points??defaultRelationPoints(p.mode),pointSlot,id)}}));setPointSlot(pointSlot===0?1:0);}
  }
  function receive(raw:Frame|null,inferenceMs:number,points:Point[]=raw?.points??[]) {
    const p=projectRef.current;if(p?.focus)raw=focusedFrame(p.mode,points,p.focus,raw?.t??performance.now(),frameBlend(raw));
    setPreviewPoints(points);
    busy.current=false;setMs(Math.round(inferenceMs));
    lastFrameAt.current=performance.now();
    if(runningRef.current&&['region','relation'].includes(projectRef.current?.learning??'')){const p=projectRef.current!;const relation=p.learning==='relation'?relationValue(p.mode,raw??relationFrame(p.mode,points),p.relation??DEFAULT_RELATION):null;const point=p.learning==='relation'?(relation===null?null:[relation?.5:0,.5] as [number,number]):regionPoint(p.mode,points,p.region??DEFAULT_REGION);const result=dwell.current.step(point,performance.now(),p.learning==='relation'?{...DEFAULT_REGION,seconds:(p.relation??DEFAULT_RELATION).seconds}:p.region??DEFAULT_REGION);setDwellProgress(result.progress);setRecognitionStatus(p.learning==='relation'?(result.state==='区域内停留中'?'关系成立中':result.state==='区域外'?'关系未成立':result.state==='已触发，请移出区域'?'已触发，请解除关系':result.state):result.state);if(result.fire&&p.actions[0])execute(p.actions[0]);}
    if(!raw){if(continuous.current){continuous.current.step(null,performance.now());setContinuousValue(null);setRecognitionStatus('等待有效姿态');}setFrame(null);smooth.current=null;if(runningRef.current&&recognizer.current)applyRecognition(recognizer.current.step(null,performance.now()));return;}
    raw={...raw,aspectRatio:(videoRef.current?.videoWidth||640)/(videoRef.current?.videoHeight||480)};
    let f=raw;const prev=smooth.current;
    if(prev&&raw.t-prev.t<220&&raw.shape.length===prev.shape.length)f={...raw,shape:raw.shape.map((v,i)=>prev.shape[i]*.25+v*.75)};
    smooth.current=f;setFrame(f);
    if(runningRef.current&&continuous.current){const result=continuous.current.step(f,f.t);setContinuousValue(result.value);setRecognitionStatus(result.value===null?'等待有效姿态':'正在运行 · 连续输出数值');if(result.emit&&result.value!==null)continuousSend.current?.(result.value);}
    const rec=recorder.current;if(rec&&f.t>=rec.start)rec.frames.push(f);
    if(runningRef.current&&recognizer.current)applyRecognition(recognizer.current.step(f,f.t));
  }
  function cancelEvaluation(){evaluationWorker.current?.terminate();evaluationWorker.current=null;setEvaluating(false);}
  function runEvaluation(){
    if(!project||isContinuous)return;stopRun();cancelEvaluation();setReport(null);setNotice('');setTab('test');setEvaluating(true);setEvaluationProgress({done:0,total:project.actions.reduce((n,a)=>n+a.samples.filter(s=>s.split==='test').length,0)});
    try{
      const worker=new Worker(new URL('./evaluation.worker.ts',import.meta.url),{type:'module'});evaluationWorker.current=worker;
      worker.onmessage=e=>{
        if(evaluationWorker.current!==worker)return;
        if(e.data.type==='progress')setEvaluationProgress({done:e.data.done,total:e.data.total});
        if(e.data.type==='complete'){setReport(e.data.report);setEvaluating(false);evaluationWorker.current=null;worker.terminate();}
        if(e.data.type==='error'){setNotice(e.data.message);cancelEvaluation();}
      };
      worker.onerror=()=>{setNotice('独立测试线程异常，请重试。');cancelEvaluation();};
      worker.postMessage({...project,mqtt:undefined,actions:project.actions.map(a=>({...a,mqtt:undefined,serial:undefined}))});
    }catch(e){setNotice('无法启动独立测试：'+(e instanceof Error?e.message:String(e)));cancelEvaluation();}
  }
  function exportEvaluation(){if(!report)return;const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=report.projectName.replace(/[\\/:*?"<>|]/g,'_')+'_独立测试报告.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function changeSplit(sampleId:string,split:'train'|'test'){stopRun();editAction(a=>({...a,trained:false,samples:a.samples.map(s=>s.id===sampleId?{...s,split}:s)}));setNotice('录制用途已调整，请重新训练。真正独立的测试应使用新录制，复制数据会被剔除。');}
  async function startCamera() {
    if(camera!=='off'||!project)return;
    const gen=++generation.current;setCamera('loading');setNotice('');setFallback(false);
    try {
      const stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:'user'},audio:false});
      if(gen!==generation.current){stream.getTracks().forEach(t=>t.stop());return;}
      streamRef.current=stream;stream.getVideoTracks().forEach(track=>{track.onended=()=>{if(gen===generation.current){stopCamera();setNotice('摄像头连接已中断，请检查设备后重新开启。');}};});const video=videoRef.current!;video.srcObject=stream;await video.play();
      const base=new URL(import.meta.env.BASE_URL,location.href).href;
      const worker=new Worker(new URL('./vision.worker.ts',import.meta.url),{type:'module'});workerRef.current=worker;
      try {await new Promise<void>((resolve,reject)=>{
        const timeout=setTimeout(()=>reject(new Error('模型加载超时')),25000);
        worker.onerror=()=>{clearTimeout(timeout);reject(new Error('Worker 初始化失败'));};
        worker.onmessage=e=>{if(e.data.type==='ready'){clearTimeout(timeout);resolve();}if(e.data.type==='error'){clearTimeout(timeout);reject(new Error(e.data.message));}};
        worker.postMessage({type:'init',mode:project.mode,base});
      });}
      catch {
        worker.terminate();if(gen!==generation.current)return;workerRef.current=null;
        // Some browsers cannot load MediaPipe's WASM loader in a module Worker.
        // Keep a throttled main-thread fallback instead of leaving the camera unusable.
        const mp=await import('@mediapipe/tasks-vision');const files=await mp.FilesetResolver.forVisionTasks(base+'wasm');if(gen!==generation.current)return;
        const opts={baseOptions:{modelAssetPath:base+'models/'+project.mode+'.task',delegate:'CPU' as const},runningMode:'VIDEO' as const};
        if(project.mode==='hand'){const d=await mp.HandLandmarker.createFromOptions(files,{...opts,numHands:1});if(gen!==generation.current){d.close();return;}mainDetector.current={detect:(v,t)=>{const points=d.detectForVideo(v,t).landmarks[0]??[];return {frame:extract('hand',points,[],t),points};},close:()=>d.close()};}
        if(project.mode==='pose'){const d=await mp.PoseLandmarker.createFromOptions(files,{...opts,numPoses:1});if(gen!==generation.current){d.close();return;}mainDetector.current={detect:(v,t)=>{const points=d.detectForVideo(v,t).landmarks[0]??[];return {frame:extract('pose',points,[],t),points};},close:()=>d.close()};}
        if(project.mode==='face'){const d=await mp.FaceLandmarker.createFromOptions(files,{...opts,numFaces:1,outputFaceBlendshapes:true});if(gen!==generation.current){d.close();return;}mainDetector.current={detect:(v,t)=>{const r=d.detectForVideo(v,t);const points=r.faceLandmarks[0]??[];return {frame:extract('face',points,r.faceBlendshapes[0]?.categories.map(c=>c.score)??[],t),points};},close:()=>d.close()};}
        setFallback(true);
      }
      if(gen!==generation.current){worker.terminate();return;}
      if(workerRef.current){worker.onmessage=e=>{if(gen!==generation.current)return;if(e.data.type==='result')receive(e.data.frame,e.data.ms,e.data.points);if(e.data.type==='error'){setNotice('检测失败：'+e.data.message);stopCamera();}};worker.onerror=()=>{setNotice('检测线程异常，请重新开启摄像头。');stopCamera();};}
      setCamera('on');let last=0;
      const loop=async(t:number)=>{
        if(gen!==generation.current)return;
        rafRef.current=requestAnimationFrame(loop);
        if(runningRef.current&&['region','relation'].includes(projectRef.current?.learning??'')&&t-lastFrameAt.current>350){dwell.current.step(null,t,projectRef.current!.region??DEFAULT_REGION);setDwellProgress(0);setRecognitionStatus('等待目标');}
        if(continuous.current&&t-lastFrameAt.current>350){continuous.current.step(null,t);setContinuousValue(null);setRecognitionStatus('等待有效姿态');}
        if(t-last<(mainDetector.current?85:65)||busy.current||video.readyState<2)return;
        last=t;busy.current=true;
        try {if(mainDetector.current){const begin=performance.now();const result=mainDetector.current.detect(video,t);receive(result.frame,performance.now()-begin,result.points);}else{const image=await createImageBitmap(video);if(gen!==generation.current){image.close();return;}workerRef.current?.postMessage({type:'frame',image,t},[image]);}}
        catch(e){busy.current=false;setNotice('视频处理失败：'+(e instanceof Error?e.message:String(e)));stopCamera();}
      };rafRef.current=requestAnimationFrame(loop);
    }catch(e){if(gen!==generation.current)return;stopCamera();setNotice(e instanceof DOMException&&e.name==='NotAllowedError'?'摄像头权限未开启。请在浏览器的网站设置中允许摄像头，再重试。':'无法开启摄像头或模型：'+(e instanceof Error?e.message:String(e)));}
  }
  function cancelRecording() {
    recorder.current=null;setRecording(false);setCountdown(null);setRecordProgress(0);if(timerRef.current)clearInterval(timerRef.current);if(recordStopTimer.current)clearTimeout(recordStopTimer.current);setNotice('本次录制已取消，未保存；已有示例保持不变。');
  }
  function finishRecording(manual=false) {
    const rec=recorder.current;recorder.current=null;setRecording(false);setCountdown(null);if(timerRef.current)clearInterval(timerRef.current);if(recordStopTimer.current)clearTimeout(recordStopTimer.current);
    if(!rec)return;
    const fs=rec.frames;
    const quality=recordingQuality(fs,manual?performance.now()-rec.start:rec.duration);
    if(!quality.valid){setNotice(quality.message);return;}
    const actual=quality.duration;
    const first=fs[0].t;
    const sample:Sample={id:uid(),frames:fs.map(f=>({...f,t:f.t-first})),duration:actual,negative:rec.negative,split:rec.split,aspectRatio:sourceSize.width/sourceSize.height};
    update(p=>({...p,actions:p.actions.map(a=>a.id===rec.target?appendSample(a,sample):a)}));
    setTab('samples');
    setNotice(rec.split==='test'?'独立测试录制已保存，不参与训练，也不会触发外部输出。':'已追加训练录制。完成后请重新训练，原有录制已保留。');
  }
  function startRecording() {
    if(!action||camera!=='on'||!frame||recording||recorder.current||countdown!==null)return;
    stopRun();setNotice('');
    const target=action.id,neg=negative,split=captureSplit,dur=duration*1000;
    const begin=()=>{
      if(timerRef.current)clearInterval(timerRef.current);
      setCountdown(null);setRecording(true);setRecordProgress(0);
      const start=performance.now();recorder.current={target,negative:neg,split,frames:[],start,duration:dur};
      timerRef.current=setInterval(()=>setRecordProgress(Math.min(1,(performance.now()-start)/dur)),50);
      recordStopTimer.current=setTimeout(()=>finishRecording(false),dur);
    };
    let remaining=project?.recordingDelay??0;
    if(remaining===0){begin();return;}
    setCountdown(remaining);
    timerRef.current=setInterval(()=>{remaining--;if(remaining<=0)begin();else setCountdown(remaining);},1000);
  }
  function train() {
    if(!action||!project)return;
    const training=action.samples.filter(s=>s.split!=='test'&&!s.negative);
    const valid=isPose?training.filter(s=>poseQuality(s).valid):training.filter(s=>energy(sequence(s.frames,project.feature))>=.025);
    if(!valid.length||labEnabled(project)&&!buildLabTemplates({...project,actions:[{...action,trained:true}]}).some(t=>!t.negative)){setNotice(isPose?'没有稳定的训练正例。录制时请保持一种姿态；独立测试录制不参与训练。':'没有足够变化的训练正例。请录制完整动作，独立测试录制不参与训练。');return;}
    const unique=isPose?buildPosePrototypes([{...action,trained:true}]).filter(t=>!t.negative).length:(labEnabled(project)?buildLabTemplates({...project,actions:[{...action,trained:true}]}):buildTemplates([{...action,trained:true}],project.feature)).filter(t=>!t.negative).length;
    stopRun();editAction(a=>({...a,trained:true}));if(isContinuous){setNotice('数值示例已训练；请训练另一个不同数值的姿态，再开始运行。');return;}setNotice(`已构建 ${unique} 个不同的${isPose?'姿态原型':'动作模板'}。${training.length>valid.length?`${training.length-valid.length} 条质量不足的训练录制未采用。`:''}${valid.length>unique?'相同录制已合并。':''}请用独立测试检查效果，匹配分数不是准确率。`);
  }
  function startRun() {
    if(!project)return;
    if((isContinuous&&action?[action]:project.actions).some(a=>(isRegion||isContinuous||a.trained)&&a.effect==='serial')&&serial.status!=='connected'){setNotice('有动作使用串口输出，请先连接串口，再开始运行。');return;}
    if((isContinuous&&action?[action]:project.actions).some(a=>(isRegion||isContinuous||a.trained)&&a.effect==='mqtt')&&mqttDirty){setNotice('MQTT 有未保存修改，请先保存配置。');return;}
    if((isContinuous&&action?[action]:project.actions).some(a=>(isRegion||isContinuous||a.trained)&&a.effect==='mqtt')&&mqtt.state!=='connected'){setNotice('有动作使用 MQTT 输出，请先保存配置并连接 Broker。');return;}
    if(isContinuous){try{const controller=new ContinuousController(buildAnchors(project.actions));const output=action;if(!output)return;const epoch=++continuousEpoch.current;continuous.current=controller;continuousSend.current=value=>{if(continuousBusy.current)return;continuousBusy.current=true;const sending=output.effect==='serial'?serial.send({...output.serial??DEFAULT_MESSAGE,text:valueMessage(output.serial?.text??'',value)}):output.effect==='mqtt'?mqtt.send({...output.mqtt??DEFAULT_MQTT_MESSAGE,payload:valueMessage(output.mqtt?.payload??'',value)}):Promise.resolve();void sending.catch(()=>{if(epoch===continuousEpoch.current){stopRun();setNotice('连续输出失败，已停止；请检查连接。');}}).finally(()=>{continuousBusy.current=false;});};runningRef.current=true;setRunning(true);setTab('run');setRecognitionStatus('等待有效姿态');setNotice('');return;}catch(e){setNotice((e as Error).message);return;}}
    if(isRegion){dwell.current=new DwellGate();runningRef.current=true;setRunning(true);setRecognitionStatus('等待目标');setNotice('');return;}
    const next=new Recognizer(project);
    if(!next.ready){setNotice('请先录制可用的训练正例并完成训练。');return;}
    recognizer.current=next;setScores({});setLocked(false);runningRef.current=true;setRunning(true);setTab('run');setNotice('');setPoseLabelId(null);setRecognitionStatus(isPose?'等待姿态':'等待完整动作');
  }
  function exportProject() {if(!project)return;const url=URL.createObjectURL(new Blob([JSON.stringify(project)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=(project.name.replace(/[\\/:*?"<>|]/g,'_')||'映动项目')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function importFile(file?:File) {
    if(!file)return;
    try{if(file.size>256_000_000)throw new Error('项目文件不能超过 256 MB。');const raw=JSON.parse(await file.text());if(raw?.kind==='audio'){setAudioProject({...cleanAudioProject(raw),id:uid()});setPage('audio');}else if(raw?.kind==='objects'){setObjectProject({...cleanObjectProject(raw),id:uid()});setPage('objects');}else enter({...validateProject(raw),id:uid()});}catch(e){setNotice(e instanceof Error?e.message:'无法读取项目文件。');}
    if(fileRef.current)fileRef.current.value='';
  }
  shortcut.current=e=>{
    const blocked=e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||e.isComposing||recordingKeyTarget(e.target,e.key)||!!document.querySelector('dialog[open]')||page!=='studio';
    // Reserve Space while the camera is active, even when no valid landmark frame exists.
    // Repeated keydowns must also stay consumed so holding Space cannot scroll the page.
    if(e.key===' '&&!blocked&&camera!=='off')e.preventDefault();
    const intent=recordingShortcut(e.key,{blocked:blocked||e.repeat,recording,countingDown:countdown!==null,ready:!isRegion&&camera==='on'&&!!frame&&!!action&&action.samples.length<MAX_SAMPLES_PER_ACTION,running:running||evaluating});
    if(!intent)return;e.preventDefault();if(intent==='cancel')cancelRecording();else if(intent==='save')finishRecording(true);else startRecording();
  };
  useEffect(()=>{const hidden=()=>{if(document.hidden)stopCamera();};const stop=()=>stopCamera();document.addEventListener('visibilitychange',hidden);window.addEventListener('motion-stop',stop);return()=>{document.removeEventListener('visibilitychange',hidden);window.removeEventListener('motion-stop',stop);};},[]);
  const inProgress=recording||countdown!==null||evaluating;
  const positive=action?.samples.filter(s=>!s.negative&&s.split!=='test').length??0;
  const testCount=project?.actions.reduce((n,a)=>n+a.samples.filter(s=>s.split==='test').length,0)??0;
  const ready=useMemo(()=>isRegion?!!project?.actions.length:isContinuous?(()=>{try{return !!buildAnchors(project!.actions).length;}catch{return false;}})():project?.actions.some(a=>a.trained),[isRegion,isContinuous,project?.actions]);
  const recordingSettings=project?(<div className="capture-settings training-only"><label className="field compact" hidden={isContinuous}>{t("录制用途")}<select aria-label={t("录制用途")} value={captureSplit} disabled={inProgress||running} onChange={e=>setCaptureSplit(e.target.value as 'train'|'test')}><option value="train">{t("训练示例")}</option><option value="test">{t("独立测试（不参与训练）")}</option></select></label><label className="field compact">{t('录制准备时间')}<select aria-label={t('录制准备时间')} value={project.recordingDelay??0} disabled={inProgress||running} onChange={e=>update(p=>({...p,recordingDelay:Number(e.target.value) as 0|1|3}))}><option value="0">{t('立即开始')}</option><option value="1">{t('1 秒')}</option><option value="3">{t('3 秒')}</option></select></label><div className="capture-duration"><div className="setting-heading recording-heading"><span>{t("最长录制（秒）")}</span><DecimalInput label={t("录制时长数值")} disabled={inProgress||running} value={duration} min={1} max={6} onChange={changeDuration}/></div><input aria-label={t("录制时长")} type="range" min="1" max="6" step=".01" value={duration} disabled={inProgress||running} onChange={e=>changeDuration(+e.target.value)}/></div><label className="checkbox-label" hidden={isContinuous}><input type="checkbox" checked={negative} disabled={inProgress||running} onChange={e=>setNegative(e.target.checked)}/>{captureSplit==='test'?t("本次不应触发任何动作"):t("录制非目标姿态/动作（负例）")}</label>{(captureSplit==='test'||isContinuous||isPose||negative)&&<p>{captureSplit==='test'?t("测试不会用于训练，结果不发送到外部设备。"):isContinuous?t("保持姿态录制，指定目标数值；换另一种姿态指定另一个数值。"):isPose?t("正例与负例都请保持一种姿态。"):t("负例帮助排除容易混淆的动作。")}</p>}</div>):null;
  return <div className="app">
    <input ref={fileRef} type="file" accept=".json,application/json" className="sr-only" onChange={e=>void importFile(e.target.files?.[0])}/>
    <header className="topbar"><button className="brand" onClick={()=>{cancelEvaluation();stopCamera();void serial.disconnect();mqtt.reset();setPage('home');}} aria-label={t("返回首页")}><span className="brand-mark"><Activity size={21}/></span><strong>Platform</strong></button><div className="top-right">{page==='home'&&<a className="icon-button github-link" href="https://github.com/ZhichenGu/Wekinator_fork" target="_blank" rel="noopener noreferrer" aria-label="GitHub" title="GitHub"><Github size={20}/></a>}<LanguageSwitch/><span className="local-badge"><span/>{page==='objects'?t("云端 API"):t("本地运行")}</span><span className="version">{t("预览版")} {PREVIEW_VERSION}</span><form method="post" action="/auth/logout" onSubmit={()=>{window.dispatchEvent(new Event('motion-stop'));cancelEvaluation();stopCamera();void serial.disconnect();mqtt.reset();}}><button className="text-button" type="submit">{t("退出")}</button></form></div></header>
    {notice&&<div className="notice" role="status"><AlertCircle size={17}/><span>{messageT(notice)}</span><button className="icon-button" onClick={()=>setNotice('')} aria-label={t("关闭提示")}><X size={16}/></button></div>}
    {page==='home'&&<main className="project-home">
      <div className="home-title"><h1>{t("项目")}</h1><div><button className="secondary" onClick={()=>fileRef.current?.click()}><FolderOpen size={17}/>{t("打开项目")}</button><button className="primary" onClick={()=>openCreate()}><Plus size={17}/>{t("新建项目")}</button></div></div>
      <div className="library-grid">
      <ProjectLibrary onCreate={()=>openCreate('tracking')} title="追踪项目" empty="暂无追踪项目" items={trackingProjects.map(p=>({id:p.id,name:p.name,detail:t(MODES[p.mode].name)+' · '+p.actions.length+' '+t('个动作')}))} onOpen={id=>{const p=trackingProjects.find(p=>p.id===id);if(p)enter(p);}} onRename={id=>{const p=trackingProjects.find(p=>p.id===id);if(p)setRenaming({kind:'tracking',id,name:p.name});}} onDelete={id=>{const p=trackingProjects.find(p=>p.id===id);if(p)requestDelete({kind:'project',id,name:p.name});}}/>
      <ProjectLibrary onCreate={()=>openCreate('vision')} title="物体检测项目" empty="暂无物体检测项目" items={objectProjects.map(p=>({id:p.id,name:p.name,detail:t(p.task==='count'?'人数与物体计数':p.task==='condition'?'自定义视觉条件':'物体检测 · API')+' · '+p.label}))} onOpen={id=>{const p=objectProjects.find(p=>p.id===id);if(p){setNotice('');setObjectProject(p);setPage('objects');}}} onRename={id=>{const p=objectProjects.find(p=>p.id===id);if(p)setRenaming({kind:'objects',id,name:p.name});}} onDelete={id=>{const p=objectProjects.find(p=>p.id===id);if(p)requestDelete({kind:'project',id:'object:'+id,name:p.name});}}/>

      <ProjectLibrary onCreate={()=>openCreate('audio')} title="声音项目" empty="暂无声音项目" items={audioProjects.map(p=>({id:p.id,name:p.name,detail:t(audioTitle(p.task))}))} onOpen={id=>{const p=audioProjects.find(p=>p.id===id);if(p){setAudioProject(p);setPage('audio');}}} onRename={id=>{const p=audioProjects.find(p=>p.id===id);if(p)setRenaming({kind:'audio',id,name:p.name});}} onDelete={id=>{const p=audioProjects.find(p=>p.id===id);if(p)requestDelete({kind:'project',id:'audio:'+id,name:p.name});}}/>
      </div>
      <LearnLinks onOpen={id=>{setNotice('');setGuideId(id);setPage('learn');}}/>
    </main>}
    {page==='learn'&&<LearnPage guideId={guideId} onSelect={setGuideId} onBack={()=>setPage('home')}/>}
    {page==='create' &&<main className="create-page"><button className="text-button" onClick={()=>setPage('home')}><ArrowLeft size={16}/>{t("返回首页")}</button><div className="create-heading"><div className="create-title-row"><h1>{t("新建项目")}</h1><p className="output-summary">{t("支持通过 Serial 向 Arduino 输出数据，或通过 MQTT 向 ESP32 输出数据。OSC 规划中。")}</p></div></div><label className="project-name">{t("项目名称")}<input maxLength={80} value={name} onChange={e=>setCustomName(e.target.value)} placeholder={t("给你的交互起个名字")}/></label><CreateChoices category={inputCategory} onCategory={setInputCategory} mode={mode} onMode={setMode} learning={learning} onLearning={setLearning} modes={MODES} visual={visualTask} onVisual={setVisualTask} audio={audioTask} onAudio={setAudioTask}/><div className="create-footer"><p>{inputCategory&&inputCategory!=='audio'?t("摄像头将在工作台中开启。"):inputCategory==='audio'?t("麦克风将在工作台中开启。"):t("选择分类后显示对应选项。")}</p><button className="primary" disabled={!name.trim()||!inputCategory} onClick={()=>{if(!inputCategory)return;if(inputCategory==='audio'){setAudioProject(newAudioProject(name.trim(),audioTask));setPage('audio');return;}if(inputCategory==='vision'){setObjectProject({...newObjectProject(name.trim(),visualTask),task:visualTask,minCount:1});setPage('objects');}else enter({schemaVersion:1,name:name.trim(),mode,learning,feature:learning==='dynamic'?'both':'shape',actions:learning==='continuous'?[{...makeAction(),controlValue:0},{...makeAction(1),controlValue:1}]:[makeAction()],updatedAt:new Date().toISOString()});}}>{t("进入工作台")}<ArrowRight size={18}/></button></div></main>}
    {page==='audio'&&audioProject&&<AudioStudio initial={audioProject} onBack={()=>setPage('home')} onSaved={()=>setAudioProjects(listAudioProjects())}/>}
    {page==='objects'&&objectProject&&<ObjectStudio initial={objectProject} onBack={()=>setPage('home')} onSaved={()=>refreshObjects()}/>}
    {page==='studio'&&project&&<main className={"studio "+(isRegion?"region-studio":"")+(cameraLayout?" camera-layout":"")}><div className="project-toolbar"><div><button className="toolbar-back" aria-label={t("工作空间")} title={t("工作空间")} onClick={()=>{cancelEvaluation();stopCamera();void serial.disconnect();mqtt.reset();setPage('home');}}><ArrowLeft size={19}/></button><h1 title={project.name}>{project.name}</h1><button className="toolbar-rename" aria-label={t('重命名')} title={t('重命名')} disabled={inProgress||running} onClick={()=>setRenaming({kind:'tracking',id:project.id!,name:project.name})}><Pencil size={15}/></button><span className="tag">{t(MODES[project.mode].name)}</span><span className="tag learning-badge">{isRegion?t(isRelation?"动作关系":"区域与停留"):isContinuous?t('连续控制'):isPose?t("姿态分类"):t("动态动作")}</span></div>{isRegion?<div className="workflow" aria-label={t('规则设置流程')}><span className="done-step"><b>1</b><span className="step-label">{t('选择检测点')}</span></span><i/><span className={running?'done-step':'active-step'}><b>2</b><span className="step-label">{t(isRelation?'设置关系':'设置区域')}</span></span><i/><span className={running?'active-step':''}><b>3</b><span className="step-label">{t('运行交互')}</span></span></div>:<div className="workflow"><span className="done-step"><b>1</b><span className="step-label">{t("选择输入")}</span></span><i/><span className={positive?'done-step':'active-step'}><b>2</b><span className="step-label">{t("录制示例")}</span></span><i/><span className={action?.trained?'done-step':positive?'active-step':''}><b>3</b><span className="step-label">{t("训练动作")}</span></span><i/><span className={running?'active-step':''}><b>4</b><span className="step-label">{t("运行交互")}</span></span></div>}<div className="toolbar-actions"><span className="save-state"><Check size={13}/>{messageT(saved)}</span><button className="icon-button" title={t("删除当前项目")} aria-label={t("删除当前项目")} disabled={inProgress} onClick={()=>requestDelete({kind:'project',name:project.name})}><Trash2 size={16}/></button><button className="secondary small" disabled={inProgress} onClick={exportProject}><Download size={15}/>{t("导出项目")}</button></div></div>

      {(project.learning??'dynamic')==='dynamic'&&<LabPanel project={project} disabled={inProgress||running} onChange={lab=>{stopRun();cancelEvaluation();setReport(null);update(p=>({...p,lab,labBaseline:!lab,actions:p.actions.map(a=>({...a,trained:false}))}));}}/>}<div className="workspace"><aside className="actions-panel">{cameraLayout&&!isRegion&&<div className="pilot-recording"><h2>{t("录制设置")}</h2>{recordingSettings}</div>}<div className="panel-title"><h2>{t("我的动作")}</h2><span>{project.actions.length.toString().padStart(2,'0')}</span></div><div className="action-list">{!project.actions.length&&<p className="no-actions">{t("暂无动作，请点击“添加动作”。")}</p>}{project.actions.map((a,i)=><ActionItem key={a.id} action={a} index={i} selected={selected===a.id} rule={isRegion} disabled={inProgress||(isContinuous&&running)} renameDisabled={running} onSelect={()=>setSelected(a.id)} onRename={name=>update(p=>({...p,actions:p.actions.map(item=>item.id===a.id?{...item,name}:item)}))}/>)}</div><button hidden={isRegion&&project.actions.length>0} className="add-action" disabled={inProgress||project.actions.length>=12} onClick={()=>{stopRun();const a=makeAction(project.actions.length,project.actions.map(a=>a.name));update(p=>({...p,actions:[...p.actions,a]}));setSelected(a.id);}}><Plus size={16}/>{t("添加动作")}</button><div className="input-mode"><Camera size={17}/><span>{t("摄像头输入")}<small>{t("单人 · 本机处理")}</small></span></div></aside>
      <section className="center-panel"><div className="camera-heading"><div><h2>{t("实时画面")}</h2><span className={'camera-state '+(camera==='on'&&(isRegion?ruleTargetVisible:!!frame)?'is-on':'')}><span/>{camera==='loading'?t("正在加载模型"):camera==='on'?(isRegion?ruleTargetVisible:!!frame)?t("追踪中"):!isRegion&&project.mode==='pose'&&previewPoints.length?t("身体已检测 · 全身不完整"):t("模型已就绪 · 等待目标"):t("摄像头未开启")}</span></div>{camera==='on'&&<div className="camera-tools">{project.mode==='face'&&<button className="text-button" aria-pressed={denseFace} onClick={()=>setDenseFace(v=>!v)}>{t(denseFace?'简洁点位':'密集点位（高级）')}</button>}<button className="text-button" aria-pressed={pinnedPreview} onClick={()=>setPinnedPreview(v=>!v)}>{t(pinnedPreview?'自动小预览':'小预览')}</button><button className="text-button" onClick={stopCamera}><Square size={13}/>{t("关闭摄像头")}</button></div>}</div><div className="camera-view" ref={stageRef}><div className="camera-content" style={cameraBox}><video ref={videoRef} autoPlay playsInline muted onLoadedMetadata={e=>{const v=e.currentTarget;setSourceSize({width:v.videoWidth||640,height:v.videoHeight||480});}}/><Skeleton points={previewPoints} mode={project.mode} focus={isRegion?(isRelation?(project.relation?.points??defaultRelationPoints(project.mode)):[project.region?.point??(project.mode==='face'?1:0)]):(project.focus??recommendedPoints(project.mode))}/>{camera==='on'&&<PointPicker dense={denseFace} compact={cameraLayout} pair={isRelation} points={previewPoints} mode={project.mode} selected={!isRegion?(project.focus??recommendedPoints(project.mode)):isRelation?(project.relation?.points??defaultRelationPoints(project.mode)):(project.region?.point!==undefined?[project.region.point]:project.mode==='pose'?[]:[project.mode==='hand'?0:1])} region={!isRegion||isRelation?undefined:project.region??DEFAULT_REGION} onSelect={choosePoint}/>}{isRegion&&!isRelation&&<div className="dwell-region" style={{left:(project.region??DEFAULT_REGION).x*100+'%',top:(project.region??DEFAULT_REGION).y*100+'%',width:(project.region??DEFAULT_REGION).width*100+'%',height:(project.region??DEFAULT_REGION).height*100+'%'}}/>}</div>{camera!=='on'&&<div className="camera-placeholder"><div className="camera-symbol"><Video size={34} strokeWidth={1.3}/></div><h3>{camera==='loading'?t("正在加载模型"):t("摄像头未开启")}</h3><p>{camera==='loading'?t("首次加载可能需要几秒，请稍候。"):t(MODES[project.mode].hint)}</p><button className="primary" disabled={camera==='loading'} onClick={()=>void startCamera()}><Camera size={17}/>{camera==='loading'?t("模型加载中…"):t("开启摄像头")}</button></div>}{camera==='on'&&<><div className="camera-hud"><span><span className="live-dot"/>LIVE</span><span>{ms}{t("ms / 检测")}{fallback?t("· 兼容模式"):''}</span></div>{!isRegion&&!running&&!inProgress&&<div className="camera-point-hint">{t("点击画面中的点可添加或移除")}</div>}{!isRegion&&<CameraRecordingKeys recording={recording} preparing={countdown!==null} disabled={running||evaluating||!frame||!action||action.samples.length>=MAX_SAMPLES_PER_ACTION} onStart={startRecording} onSave={()=>finishRecording(true)} onCancel={cancelRecording}/>}<div className="camera-hint">{isRegion&&!previewPoints.length?t(project.mode==='hand'?'未检测到手部，请将手完整放入画面。':project.mode==='face'?'未检测到面部，请正对摄像头。':'未检测到身体，请进入画面。'):!isRegion&&project.focus?t('请让关注点及必要的参考点清晰可见。'):isRegion?t(isRelation?'选择 A 或 B，再点击画面中的骨骼点。':'点击骨骼点选择检测位置；红点进入区域后开始计时。'):project.mode==='pose'&&previewPoints.length&&!frame?t("已检测到身体。请让肩、髋、手腕、膝盖和脚踝清晰入镜后再录制。"):t(MODES[project.mode].hint)}</div></>}{countdown!==null&&<div className="countdown">{countdown}<small>{t("准备好你的动作")}</small></div>}{recording&&<div className="recording-banner"><span className="rec-dot"/>{t("正在录制")}{negative?t("负例"):t("示例")}<span>{(recordProgress*duration).toFixed(2)} / {duration.toFixed(2)} s</span><div style={{width:recordProgress*100+'%'}}/></div>}</div>
      {isRegion?<div className="region-readout" role="status"><strong>{running?messageT(recognitionStatus):t(isRelation?"稳定确认进度":"停留进度")}</strong>{isRelation&&<p>{t('当前距离：{0}（相对尺寸）',relationDistance(relationFrame(project.mode,previewPoints),project.mode,project.relation??DEFAULT_RELATION)?.toFixed(2)??'—')}</p>}<progress max="1" value={dwellProgress}/><p>{(dwellProgress*100).toFixed(0)}%</p></div>:<>      {!cameraLayout&&recordingSettings}<div className="capture-bar"><div><span className="section-kicker">{running?t("实时匹配"):t("录制示例")}</span><p>{running?(isContinuous?messageT(recognitionStatus):recognitionStatus):!action?t("先添加或选择一个动作。"):action.samples.length>=MAX_SAMPLES_PER_ACTION?t("已达到 {0} 次录制，请先删除不需要的录制。", MAX_SAMPLES_PER_ACTION):t("{0}将追加到“{1}”。{2}", captureSplit==='test'?t("独立测试"):t("训练"), action.name, isPose?t("请保持一种姿态。"):t("请完整做一遍动作。"))}</p></div>{running?<button className="secondary" onClick={stopRun}><Square size={15}/>{t("停止运行")}</button>:<RecordingControls recording={recording} preparing={countdown!==null} disabled={camera!=='on'||!frame||!action||action.samples.length>=MAX_SAMPLES_PER_ACTION} hasSamples={!!action?.samples.length} onStart={startRecording} onCancel={cancelRecording} onSave={()=>finishRecording(true)}/>}</div>
      <div className="tabs"><button className={tab==='samples'?'active':''} onClick={()=>setTab('samples')}>{t("动作录制")}<span>{action?.samples.length??0}</span></button><button className={tab==='run'?'active':''} onClick={()=>setTab('run')}>{t("运行反馈")}</button><button title={isContinuous?t("连续控制请在运行反馈中检查数值；当前不提供分类式独立测试报告。"):undefined} disabled={isContinuous} className={tab==='test'?'active':''} onClick={()=>setTab('test')}>{t("独立测试")}<span>{testCount}</span></button></div>
      {tab==='samples'?<div className="samples-area">{!action?.samples.length?<div className="empty-samples"><Layers size={24} strokeWidth={1.4}/><div><strong>{t("暂无录制")}</strong><p>{t("只保存骨骼数据，不保存视频。")}</p></div></div>:<HistoryList label="动作录制列表" latestKey={action.id+':'+action.samples[action.samples.length-1].id}><div className="sample-list">{action.samples.map((s,i)=>({s,i})).reverse().map(({s,i})=><div className="sample-row" key={s.id}><span className="sample-number">{(i+1).toString().padStart(2,'0')}</span><div><strong>{t("第")}{i+1}{t("次录制")}{s.negative?t(" · 负例"):''}</strong><small>{(s.duration/1000).toFixed(2)}{t("秒 ·")}{s.frames.length}{t("个采样点")}{isPose&&s.split!=='test'&&!poseQuality(s).valid?t(" · 姿态不够稳定"):''}</small></div><select className="sample-split" aria-label={t("第 {0} 次录制用途", i+1)} value={s.split??'train'} disabled={inProgress||running||isContinuous} onChange={e=>changeSplit(s.id,e.target.value as 'train'|'test')}><option value="train">{t("训练")}</option><option value="test">{t("独立测试")}</option></select><div className="sample-wave" aria-hidden="true">{Array.from({length:25},(_,k)=><i key={k} style={{height:8+Math.min(24,Math.abs((s.frames[Math.min(s.frames.length-1,Math.floor(k*s.frames.length/25))]?.shape[3]??0))*15)}}/>)}</div><button className="icon-button" aria-label={t("回放示例 {0}", i+1)} disabled={inProgress||running} onClick={()=>{setReplay(s);setReplayIndex(0);}}><Play size={15}/></button><button className="icon-button" disabled={inProgress||running} aria-label={t("删除示例 {0}", i+1)} onClick={()=>requestDelete({kind:'sample',name:t("第 {0} 次录制", i+1),id:s.id,actionId:action.id})}><Trash2 size={15}/></button></div>)}</div></HistoryList>}</div>:tab==='run'?<div className="run-area">{isContinuous?<div className="continuous-readout" role="status"><strong>{t('实时数值')}</strong><output>{continuousValue===null?'—':continuousValue.toFixed(3)}</output><meter min="0" max="1" value={continuousValue??0}/><p>{t('范围 0–1；追踪丢失或超出示例范围时暂停输出。')}</p></div>:<div className="match-list">{project.actions.map(a=><div className="match-row" key={a.id}><div><strong>{a.name}</strong><span>{a.trained?((scores[a.id]??0)*100).toFixed(2)+' / 100':t("待训练")}</span></div><div className="meter"><i style={{width:(scores[a.id]??0)*100+'%'}}/><span style={{left:a.threshold*100+'%'}}/></div></div>)}<small>{t("匹配程度用于比较动作相似性，不代表正确概率。")}</small></div>}<div className="event-log" hidden={isContinuous}>{isContinuous&&<p>{t("连续控制请在运行反馈中检查数值；当前不提供分类式独立测试报告。")}</p>}<strong>{t("最近触发")}</strong>{!logs.length?<p>{t("完整动作匹配成功后，会在这里留下记录。")}</p>:<HistoryList label="触发记录列表" latestKey={logs.length+':'+logs[0].time}>{logs.map((l,i)=><p key={i}><span>{l.time}</span>{l.name}<small>{l.result?messageT(l.result):(l.manual?t("手动测试"):t("动作匹配"))}</small></p>)}</HistoryList>}</div></div>:<EvaluationPanel report={report} busy={evaluating} progress={evaluationProgress} total={testCount} ready={!!ready} onRun={runEvaluation} onCancel={cancelEvaluation} onExport={exportEvaluation}/>}</>}</section>
      <aside className="settings-panel">{action&&<><div className="panel-title"><h2>{t("动作设置")}</h2><button className="icon-button" title={t("删除当前动作")} aria-label={t("删除动作 {0}", action.name)} disabled={inProgress||isRegion} onClick={()=>requestDelete({kind:'action',name:action.name,id:action.id})}><Trash2 size={17}/></button></div>{!isRegion&&<SettingFold enabled={cameraLayout} title="关注部位"><FocusControls mode={project.mode} value={project.focus} onChange={setFocus} disabled={inProgress||running}/ ></SettingFold>}{isRelation&&<RelationControls slot={pointSlot} onSlotChange={setPointSlot} value={project.relation??DEFAULT_RELATION} onChange={relation=>{stopRun();update(p=>({...p,relation}));}} disabled={running} mode={project.mode}/ >}{isRegion&&!isRelation&&<RegionControls value={project.region??DEFAULT_REGION} onChange={region=>{stopRun();update(p=>({...p,region}));}} disabled={running} mode={project.mode}/ >}{isContinuous&&<div className="setting-section"><label>{t('此姿态的目标数值')}<DecimalInput label={t('目标数值')} value={action.controlValue??0} min={0} max={1} disabled={inProgress||running} onChange={v=>{stopRun();editAction(a=>({...a,controlValue:v,trained:false}));}}/></label><p>{t('至少录制并训练两种姿态，分别指定不同数值，例如 0 和 1。')}</p><p>{t('运行使用当前选中示例的输出设置；最多每秒发送 10 次，静止时每秒更新一次。')}</p></div>}{!isRegion&&<SettingFold enabled={cameraLayout} title="学习方式"><div className="setting-section training-only"><div className="setting-heading"><span>{t("学习方式")}</span><span className="tiny-tag">{isContinuous?t("连续"):isPose?t("静态"):t("动态")}</span></div><strong className="setting-main">{isContinuous?t("连续控制"):isPose?t("姿态分类"):t("动态动作匹配")}</strong>{isPose&&!isContinuous?<><div className="setting-heading hold-heading"><span>{t("稳定确认（秒）")}</span><DecimalInput label={t("姿态稳定确认时长")} disabled={inProgress||running} value={project.poseHoldSeconds??.35} min={.1} max={3} onChange={n=>update(p=>({...p,poseHoldSeconds:n}))}/></div></>:!isContinuous&&<FeatureChoices value={project.feature} disabled={inProgress||running} onChange={feature=>{stopRun();cancelEvaluation();setReport(null);update(p=>({...p,feature,actions:p.actions.map(a=>({...a,trained:false}))}));}}/>}</div></SettingFold>}<div className="setting-section output-section"><div className="setting-heading"><span>{t("输出方式")}</span></div><OutputChoices value={action.effect} disabled={inProgress||running} onChange={effect=>editAction(a=>({...a,effect}))}/>{isContinuous&&<p>{t('连续模式发送 0–1 数值；消息可用 {value} 占位，未填写占位时只发送数值。LED 开关案例不适用于连续数值。')}</p>}<div className="trigger-feedback" role="status">{isContinuous?<span>{running?(continuousValue===null?t("等待有效姿态"):continuousValue.toFixed(3)):t("未运行")}</span>:<><i className={`signal-light ${signal?.id===action.id?(signal.result==='failed'?'failed':'matched'):running&&isPose&&poseLabelId===action.id?'matched':running?'waiting':'idle'}`}/><span>{signal?.id===action.id?(signal.result==='failed'?t("发送失败"):signal.result==='sent'?t("已提交输出"):t("动作已触发")):running?(isRegion?messageT(recognitionStatus):isPose&&poseLabelId===action.id?t("姿态已确认"):isPose?t("等待姿态"):t("等待完整动作")):t("未运行")}</span></>}</div>{action.effect==='indicator'?<button className="secondary small" disabled={inProgress||running} onClick={()=>execute(action,true)}>{t("测试状态灯")}</button>:action.effect==='serial'?<SerialPanel continuous={isContinuous} output={serial} message={action.serial} baudRate={project.serialBaudRate??9600} disabled={inProgress||running} onMessage={m=>editAction(a=>({...a,serial:m}))} onBaudRate={n=>update(p=>({...p,serialBaudRate:n}))} onTest={()=>execute(action,true)}/>:<MqttPanel continuous={isContinuous} onDirtyChange={setMqttDirty} output={mqtt} config={project.mqtt} value={action.mqtt} actionId={action.id} disabled={inProgress||running} onSave={(config,message)=>update(p=>({...p,mqtt:config,actions:p.actions.map(a=>a.id===action.id?{...a,mqtt:message}:a)}))} onTest={()=>execute(action,true)}/>}</div>{!isContinuous&&!isRegion&&<div className="setting-section"><div className="setting-heading"><span>{t("触发阈值 / 100")}</span><DecimalInput label={t("触发阈值数值")} disabled={inProgress||running} value={action.threshold*100} min={50} max={98} onChange={n=>editAction(a=>({...a,threshold:n/100}))}/></div><input aria-label={t("触发阈值")} type="range" min=".5" max=".98" step=".0001" value={action.threshold} disabled={inProgress||running} onChange={e=>editAction(a=>({...a,threshold:+e.target.value}))}/><p>{t("阈值越高，动作需要越接近示范。当前未做独立校准。")}</p></div>}</>}{!action&&<p className="no-actions">{t("添加或选择一个动作后设置参数。")}</p>}</aside></div>
      {cameraLayout&&camera==='on'&&<FloatingPreview pinned={pinnedPreview} mode={project.mode} video={videoRef} stage={stageRef} points={previewPoints} sourceSize={sourceSize} status={isContinuous?(running?(continuousValue===null?t("等待有效姿态"):continuousValue.toFixed(3)):t("未运行")):signal?.id===action?.id?t(signal?.result==='failed'?"发送失败":signal?.result==='sent'?"已提交输出":"动作已触发"):running?(isRegion?messageT(recognitionStatus):isPose&&poseLabelId===action?.id?t("姿态已确认"):isPose?t("等待姿态"):t("等待完整动作")):t("未运行")} signal={isContinuous?(running&&continuousValue!==null?'matched':'idle'):signal?.id===action?.id?(signal?.result==='failed'?'failed':'matched'):running&&isPose&&poseLabelId===action?.id?'matched':running?'waiting':'idle'}/>}
      <footer className="studio-footer"><div className="footer-status"><span className={'status-dot '+(ready?'ready':'')}/><span>{evaluating?t("独立测试中 · 不发送外部消息"):inProgress?t("正在采集数据，请保持目标清晰"):running?(isRegion?messageT(recognitionStatus):isContinuous?t("正在运行 · 连续输出数值"):isPose?t("正在运行 · 稳定姿态触发一次"):t("正在运行 · 完整匹配后触发一次")):isRegion?t(camera!=='on'?"开启摄像头后运行":isRelation?"关系已设置，可以开始运行":"区域已设置，可以开始运行"):action?.trained?t("动作模板已就绪，可以开始运行"):positive?t("已有示例，下一步训练动作"):!action?t("先添加动作"):t("先录制示例，再训练动作")}</span></div><div><button className="secondary" hidden={isRegion} disabled={!positive||inProgress||running} onClick={train}><Layers size={16}/>{action?.trained?t("重新训练"):t("训练动作")}</button><button className="primary" disabled={!ready||camera!=='on'||inProgress} onClick={running?stopRun:startRun}>{running?<Square size={16}/>:<Play size={16} fill="currentColor"/>}{running?t("停止运行"):t("开始运行")}</button></div></footer>
    </main>}
    {replay&&project&&<SampleEditor key={replay.id} sample={replay} mode={project.mode} onClose={()=>setReplay(null)} onApply={trimmed=>{stopRun();update(p=>({...p,actions:p.actions.map(a=>a.id===selected?trimActionSample(a,trimmed):a)}));setReplay(null);setNotice(trimmed.split==='test'?'测试录制已裁剪，请重新运行独立测试。':'训练录制已裁剪，请重新训练动作。');}}/>}
    {renaming&&<RenameProjectDialog name={renaming.name} onClose={()=>setRenaming(null)} onSave={async name=>{if(renaming.kind==='audio'){const p=audioProjects.find(p=>p.id===renaming.id);if(!p)throw new Error('项目不存在。');saveAudioProject({...p,name});setAudioProjects(listAudioProjects());}else if(renaming.kind==='objects'){renameObjectProject(renaming.id,name);refreshObjects();}else{const p=trackingProjects.find(p=>p.id===renaming.id)??(project?.id===renaming.id?project:null);if(!p)throw new Error('项目不存在。');if(projectRef.current?.id===p.id){if(saveTimer.current)clearTimeout(saveTimer.current);setProject({...p,name,updatedAt:new Date().toISOString()});}await saveProject({...p,name,updatedAt:new Date().toISOString()});await refreshTracking();}}}/>}


    {deletion&&<ConfirmDelete title={t("删除{0}？", deletion.kind==='project'?t("项目"):deletion.kind==='action'?t("动作"):t("录制"))} description={`“${deletion.name}”${deletion.kind==='project'?t("及其本地动作和示例将被移除。已导出的项目文件不受影响。"):deletion.kind==='action'?t("及其全部录制将被移除，其他动作会保留。"):t("将被移除，该动作需要重新训练。")}`} busy={deleting} onCancel={()=>setDeletion(null)} onConfirm={()=>void confirmDelete()}/>}
  </div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
