import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,Camera,Download,Play,Square,X,Pencil} from 'lucide-react';
import {t,messageT} from './i18n';
import {type Project,type Point,validateProject} from './core';
import {CoordinateSampler,defaultCoordinates,coordinateText,coordinateOsc,type CoordinateFrame} from './coordinates';
import {saveProject} from './storage';
import {useLandmarkCamera} from './useLandmarkCamera';
import {PointPicker} from './PointPicker';
import {Skeleton} from './Skeleton';
import {landmarkIds} from './region';
import {landmarkLabel} from './landmark-labels';
import {WorkspaceSettings} from './HandSettings';
import {ProjectSaveStatus} from './ProjectSaveStatus';
import {SerialPanel,useSerialOutput} from './SerialPanel';
import {MqttPanel,useMqttOutput} from './MqttPanel';
import {OscPanel,sendOsc} from './OscPanel';
import {DEFAULT_MQTT_MESSAGE} from './mqtt-output';
import {RenameProjectDialog} from './ProjectLibrary';

export function CoordinateStudio({initial,onBack}:{initial:Project;onBack:()=>void}) {
  const [project,setProject]=useState(initial);
  const config=project.coordinates??defaultCoordinates(project.mode);
  const action=project.actions[0];
  const serial=useSerialOutput(),mqtt=useMqttOutput();
  const [dirty,setDirty]=useState(false),[running,setRunning]=useState(false),[points,setPoints]=useState<Point[]>([]);
  const [values,setValues]=useState<CoordinateFrame|null>(null),[notice,setNotice]=useState(''),[output,setOutput]=useState('未运行');
  const [saveError,setSaveError]=useState(''),[saved,setSaved]=useState(false),[renaming,setRenaming]=useState(false);
  const queue=useRef<Promise<unknown>>(Promise.resolve()),revision=useRef(0),alive=useRef(true);
  const camera=useLandmarkCamera(project.mode,setPoints);
  const sampler=useRef(new CoordinateSampler(project.mode,config));
  const inFlight=useRef(false),epoch=useRef(0);
  const latest=useRef({project,action,running,serial,mqtt});
  latest.current={project,action,running,serial,mqtt};
  function stop(){epoch.current++;setRunning(false);setOutput('未运行');sampler.current.reset();}
  function edit(patch:Partial<Project>){
    stop();setProject(p=>({...p,...patch,updatedAt:new Date().toISOString()}));
  }
  function editAction(patch:Partial<typeof action>){edit({actions:[{...action,...patch}]});}
  useEffect(()=>{
    const version=++revision.current;setSaved(false);
    const snapshot=validateProject({...project});
    queue.current=queue.current.catch(()=>{}).then(()=>saveProject(snapshot)).then(()=>{
      if(alive.current&&version===revision.current){setSaved(true);setSaveError('');}
    }).catch(()=>{if(alive.current&&version===revision.current)setSaveError('本地保存失败，请导出项目');});
  },[project]);
  useEffect(()=>{sampler.current=new CoordinateSampler(project.mode,config);},[project.coordinates]);
  useEffect(()=>{alive.current=true;return ()=>{alive.current=false;epoch.current++;};},[]);
  useEffect(()=>{if(camera.state!=='on')stop();},[camera.state]);
  async function send(frame:CoordinateFrame) {
    if(inFlight.current)return;
    const generation=epoch.current,c=latest.current;
    inFlight.current=true;
    try {
      if(c.action.effect==='osc')await sendOsc(coordinateOsc(frame),c.action.osc??{host:'127.0.0.1',port:9000,address:'/platform/'+c.project.mode});
      if(c.action.effect==='serial')await c.serial.send({text:coordinateText(frame),lineEnding:'lf'});
      if(c.action.effect==='mqtt')await c.mqtt.send({...c.action.mqtt??DEFAULT_MQTT_MESSAGE,payload:coordinateText(frame)});
      if(generation===epoch.current)setOutput(c.action.effect==='indicator'?'仅预览':'已提交输出');
    } catch(e) {
      if(generation===epoch.current){stop();setOutput('发送失败');setNotice((e as Error).message);}
    } finally {inFlight.current=false;}
  }
  useEffect(()=>{
    const {frame,due}=sampler.current.step(points,performance.now());setValues(frame);
    if(latest.current.running&&frame&&due)void send(frame);
  },[points]);
  function start() {
    if(action.effect==='serial'&&serial.status!=='connected'){setNotice('请先连接串口。');return;}
    if(action.effect==='mqtt'&&(mqtt.state!=='connected'||dirty)){setNotice('请先保存 MQTT 配置并连接 Broker。');return;}
    sampler.current.reset();epoch.current++;setRunning(true);setNotice('');setOutput('等待目标');
  }
  function select(id:number){
    if(config.points.includes(id)){
      if(config.points.length===1)return;
      edit({coordinates:{...config,points:config.points.filter(n=>n!==id)}});
    } else if(config.points.length<4)edit({coordinates:{...config,points:[...config.points,id]}});
    else setNotice('最多同时输出四个点，请先移除一个点。');
  }
  function download(){
    const url=URL.createObjectURL(new Blob([JSON.stringify(validateProject({...project}),null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download=project.name+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const osc=action.osc??{host:'127.0.0.1',port:9000,address:'/platform/'+project.mode};
  const status=output==='发送失败'?'error':
    action.effect==='mqtt'&&(dirty||mqtt.state!=='connected')||action.effect==='serial'&&serial.status!=='connected'?'pending':'ready';
  const sample=values??{mode:project.mode,t:0,points:config.points.map(id=>({id,x:.5,y:.5,...(config.axes==='xyz'?{z:0}:{})}))};
  return <main className="object-studio coordinate-workspace">
    <div className="object-toolbar">
      <button className="toolbar-back" aria-label={t('工作空间')} onClick={async()=>{stop();await queue.current;onBack();}}><ArrowLeft size={19}/></button>
      <h1>{project.name}</h1><button className="toolbar-rename" aria-label={t('重命名')} onClick={()=>setRenaming(true)}><Pencil size={15}/></button>
      <span className="tag">{t(project.mode==='hand'?'手部追踪':project.mode==='face'?'面部追踪':'身体追踪')}</span><span className="tag">{t('坐标输出')}</span>
      <div className="object-tools">{saved||saveError?<ProjectSaveStatus error={saveError}/>:<span className="save-state" role="status">{t('保存中…')}</span>}
      <button className="secondary small" onClick={download}><Download size={15}/>{t('导出项目')}</button></div>
    </div>
    {(notice||camera.error)&&<p className="object-notice" role="alert">{messageT(notice||camera.error)}<button className="icon-button" aria-label={t('关闭提示')} onClick={()=>setNotice('')}><X size={14}/></button></p>}
    <div className="object-grid coordinate-grid">
      <aside className="object-config"><h2>{t('输出检测点')}</h2>
        <p className="object-help">{t('点击画面选点，最多四个。也可从下方选择。')}</p>
        {config.points.map(id=><button className="coordinate-point chosen" key={id} onClick={()=>select(id)} aria-label={t('移除检测点 {0}',id)} disabled={config.points.length===1}>{landmarkLabel(project.mode,id)}{config.points.length>1&&<X size={14}/>}</button>)}
        <label className="field">{t('添加检测点')}<select aria-label={t('添加检测点')} value="" disabled={config.points.length>=4} onChange={e=>select(Number(e.target.value))}><option value="">{t('选择检测点')}</option>{landmarkIds(project.mode).filter(id=>!config.points.includes(id)).map(id=><option key={id} value={id}>{landmarkLabel(project.mode,id)}</option>)}</select></label>
        <p className="object-help">{t('XY 与镜像画面一致，左上为 0、0，右下为 1、1。Z 为相对深度。')}</p>
      </aside>
      <section className="object-camera"><div className="object-camera-title"><h2>{t('实时画面')}</h2><span>{t(camera.state==='on'?'追踪中':camera.state==='opening'?'正在开启摄像头':'摄像头未开启')}</span></div>
        <div className="coordinate-stage" style={{aspectRatio:camera.size.width/camera.size.height}}>
          <video ref={camera.video} autoPlay muted playsInline/>
          {camera.state==='on'&&<><Skeleton points={points} mode={project.mode} focus={config.points}/><PointPicker points={points} mode={project.mode} selected={config.points} onSelect={select} pair={false}/></>}
          {camera.state!=='on'&&<div className="coordinate-empty"><Camera size={32}/><p>{t(camera.state==='opening'?'正在开启摄像头':'摄像头未开启')}</p></div>}
        </div>
        <div className="object-buttons"><button className="secondary" disabled={camera.state==='opening'} onClick={()=>camera.state==='on'?camera.stop():void camera.start()}>{t(camera.state==='on'?'关闭摄像头':'开启摄像头')}</button>
          <button className="primary" disabled={camera.state!=='on'} onClick={running?stop:start}>{running?<Square size={15}/>:<Play size={15}/>} {t(running?'停止输出':'开始输出')}</button></div>
      </section>
      <aside className="object-output"><h2>{t('实时坐标')}</h2><strong role="status">{t(camera.state==='on'?(values?'追踪中':'追踪丢失，暂停坐标输出'):'等待目标')}</strong>
        {config.points.map(id=>{const point=values?.points.find(p=>p.id===id);return <div className="coordinate-readout" key={id}><strong>{landmarkLabel(project.mode,id)}</strong><dl>{(config.axes==='xy'?['x','y']:['x','y','z']).map(axis=><div key={axis}><dt>{axis.toUpperCase()}</dt><dd>{point?(point[axis as 'x'|'y'|'z']??0).toFixed(3):'—'}</dd></div>)}</dl></div>;})}
        <p>{t('输出状态')} · {t(running&&!values?'等待目标':output)}</p><p className="object-help">{t('单目标追踪；丢失后暂停，重新追踪到后继续。停止后不补发。')}</p>
      </aside>
    </div>
    <WorkspaceSettings status={status} sections={[
      {label:'坐标设置',content:<>
        <label className="field">{t('坐标维度')}<select value={config.axes} onChange={e=>edit({coordinates:{...config,axes:e.target.value as 'xy'|'xyz'}})}><option value="xy">XY</option><option value="xyz">XYZ</option></select></label>
        <label className="field">{t('发送频率')}<select value={config.hz} onChange={e=>edit({coordinates:{...config,hz:Number(e.target.value)}})}>{[5,10,15,20,30].map(n=><option value={n} key={n}>{n} Hz</option>)}</select></label>
        <label className="field">{t('坐标平滑')}<select value={config.smoothing} onChange={e=>edit({coordinates:{...config,smoothing:Number(e.target.value)}})}><option value="0">{t('关闭')}</option><option value="0.35">{t('轻度')}</option><option value="0.7">{t('较强')}</option></select></label>
        <p>{t('频率为发送上限，实际受检测速度与连接速度限制。修改设置会停止输出。')}</p><p>{t('Z 使用检测器的相对深度，不代表摄像头距离或厘米。')}</p>
      </>},
      {label:'输出方式',content:<>
        <div className="output-choices" role="group" aria-label={t('输出方式')}>{(['indicator','serial','osc','mqtt'] as const).map(value=><button key={value} className={action.effect===value?'selected':''} aria-pressed={action.effect===value} disabled={running} onClick={()=>{void serial.disconnect();mqtt.reset();editAction({effect:value});}}>{value==='indicator'?t('仅预览'):value==='serial'?'Serial':value.toUpperCase()}</button>)}</div>
        {action.effect==='serial'&&<SerialPanel coordinates output={serial} message={{text:'coordinates',lineEnding:'lf'}} baudRate={project.serialBaudRate??115200} disabled={running} onMessage={()=>{}} onBaudRate={serialBaudRate=>edit({serialBaudRate})} onTest={()=>void send(sample)}/>}
        {action.effect==='mqtt'&&<MqttPanel coordinates output={mqtt} config={project.mqtt} value={action.mqtt??{topic:'platform/coordinates',payload:'coordinates',qos:0}} actionId={action.id} disabled={running} onDirtyChange={setDirty} onSave={(broker,message)=>edit({mqtt:broker,actions:[{...action,mqtt:message}]})} onTest={()=>void send(sample)}/>}
        {action.effect==='osc'&&<OscPanel coordinates continuous target={osc} onSave={osc=>editAction({osc})} disabled={running} onTest={()=>void send(sample)}/>}
        <p className="object-help">{t('测试发送使用当前有效坐标；没有目标时发送 0.5、0.5 的测试值。')}</p>
        <a href={import.meta.env.BASE_URL+'examples/coordinate_receivers.zip'} download>{t('下载坐标接收案例（五种软件）')}</a>
      </>}
    ]}/>
    {renaming&&<RenameProjectDialog name={project.name} onClose={()=>setRenaming(false)} onSave={async name=>edit({name})}/>}
  </main>;
}
