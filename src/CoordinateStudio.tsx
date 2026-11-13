import {coordinateHandSide} from './coordinate-hands';
import {CoordinatePointDialog} from './CoordinatePointDialog';
import {CameraPlaceholder} from './CameraPlaceholder';
import {CoordinateOutputDialog} from './CoordinateOutputDialog';
import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,Download,Play,Square,X,Pencil,Plus,ChevronDown} from 'lucide-react';
import {t,messageT} from './i18n';
import {type Project,type Point,validateProject} from './core';
import {CoordinateSampler,lockCoordinateScope,coordinateOutputIds,selectCoordinatePoints,defaultCoordinates,coordinateText,coordinateOsc,coordinateAxes,coordinateName,coordinatePointLimit,type CoordinateConfig,type CoordinateFrame,type CoordinateHandOutput} from './coordinates';
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
  const [project,setProject]=useState(()=>({...initial,coordinates:lockCoordinateScope(initial.mode,initial.coordinates??{...defaultCoordinates(initial.mode),named:false})}));
  const config=project.coordinates??{...defaultCoordinates(project.mode),named:false};
  const action=project.actions[0];
  const dual=project.mode==='hand'&&config.handMode==='dual';
  const [editingHand,setEditingHand]=useState(0);
  const [pointDialog,setPointDialog]=useState<{replacing?:number}|null>(null);
  const presets=[{key:'index',label:'食指尖',ids:[8]},{key:'wrist',label:'手腕',ids:[0]},{key:'pinch',label:'拇指与食指',ids:[4,8]},{key:'tips',label:'五个指尖',ids:[4,8,12,16,20]},{key:'all',label:'整只手 · 21 点',ids:Array.from({length:21},(_,id)=>id)}];
  const offset=dual?Math.max(0,editingHand)*21:0;
  const handHint=!dual||config.outputHands==='any'?'将一只手完整放入画面，保持手指清晰可见。':config.outputHands==='left'?'将左手完整放入画面，保持手指清晰可见。':config.outputHands==='right'?'将右手完整放入画面，保持手指清晰可见。':'左右手可独立追踪，保持手指清晰可见。';
  const selected=config.points.filter(id=>!dual||Math.floor(id/21)===editingHand);
  const serial=useSerialOutput(),mqtt=useMqttOutput();
  const [outputDialog,setOutputDialog]=useState(false);
  const [dirty,setDirty]=useState(false),[running,setRunning]=useState(false),[points,setPoints]=useState<Point[]>([]);
  const [circlePositions,setCirclePositions]=useState([{x:.3,y:.5},{x:.7,y:.5}]);
  const [values,setValues]=useState<CoordinateFrame|null>(null),[notice,setNotice]=useState(''),[output,setOutput]=useState('未运行');
  const [saveError,setSaveError]=useState(''),[saved,setSaved]=useState(false),[renaming,setRenaming]=useState(false);
  const queue=useRef<Promise<unknown>>(Promise.resolve()),revision=useRef(0),alive=useRef(true);
  const camera=useLandmarkCamera(project.mode,setPoints,config);
  const sampler=useRef(new CoordinateSampler(project.mode,config));
  const inFlight=useRef(false),epoch=useRef(0);
  const latest=useRef({project,action,running,serial,mqtt});
  latest.current={project,action,running,serial,mqtt};
  function stop(){epoch.current++;setRunning(false);setOutput('未运行');sampler.current.reset(camera.state==='on');}
  function edit(patch:Partial<Project>){
    stop();if(patch.coordinates){setValues(null);setPoints([]);}
    setProject(p=>({...p,...patch,updatedAt:new Date().toISOString()}));
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
  async function send(frame:CoordinateFrame,override?:CoordinateConfig) {
    if(inFlight.current)return;
    const generation=epoch.current,c=latest.current;
    const outputConfig=override??c.project.coordinates??{...defaultCoordinates(c.project.mode),named:false};
    inFlight.current=true;
    try {
      if(c.action.effect==='osc')await sendOsc(coordinateOsc(frame,outputConfig),c.action.osc??{host:'127.0.0.1',port:9000,address:'/platform/'+c.project.mode});
      if(c.action.effect==='serial')await c.serial.send({text:coordinateText(frame,outputConfig),lineEnding:'lf'},true);
      if(c.action.effect==='mqtt')await c.mqtt.send({...c.action.mqtt??DEFAULT_MQTT_MESSAGE,payload:coordinateText(frame,outputConfig)},true);
      if(generation===epoch.current)setOutput(c.action.effect==='indicator'?'仅预览':'已提交输出');
    } catch(e) {
      if(generation===epoch.current){stop();setOutput('发送失败');setNotice((e as Error).message);}
    } finally {inFlight.current=false;}
  }
  useEffect(()=>{
    const {frame,due}=sampler.current.step(points,performance.now());setValues(frame);
    if(dual&&frame)setCirclePositions(previous=>previous.map((position,hand)=>frame.points.find(p=>Math.floor(p.id/21)===hand)??position));
    if(latest.current.running&&frame&&due)void send(frame);
  },[points]);
  function start() {
    if(!coordinateOutputIds(config).length){setNotice('请先为要输出的手选择检测点。');return;}
    if(action.effect==='serial'&&serial.status!=='connected'){setNotice('请先连接串口。');return;}
    if(action.effect==='mqtt'&&(mqtt.state!=='connected'||dirty)){setNotice('请先保存 MQTT 配置并连接 Broker。');return;}
    sampler.current.reset(true);epoch.current++;setRunning(true);setNotice('');setOutput('等待目标');
  }
  function updatePoints(ids:number[]){
    edit({coordinates:selectCoordinatePoints(project.mode,config,ids)});
  }
  function select(id:number){
    if(config.points.includes(id)){
      if(config.points.length>1)updatePoints(config.points.filter(n=>n!==id));
    }else if(config.points.length<coordinatePointLimit(project.mode,config))updatePoints([...config.points,id]);
  }
  function applyPoints(ids:number[]){
    const replacing=pointDialog?.replacing;
    if(replacing===undefined){updatePoints([...config.points,...ids]);return;}
    if(ids[0]===replacing)return;
    const points=config.points.map(id=>id===replacing?ids[0]:id);
    const names={...config.names};
    if(names[replacing]!==undefined){names[ids[0]]=names[replacing];delete names[replacing];}
    edit({coordinates:selectCoordinatePoints(project.mode,{...config,names:config.names?names:undefined},points)});
  }
  function preset(ids:number[]){
    const remaining=dual?config.points.filter(id=>Math.floor(id/21)!==editingHand):[];
    updatePoints([...remaining,...ids.map(id=>id+offset)]);
  }
  function download(){
    const url=URL.createObjectURL(new Blob([JSON.stringify(validateProject({...project}),null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download=project.name+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const osc=action.osc??{host:'127.0.0.1',port:9000,address:'/platform/'+project.mode};
  const status=output==='发送失败'?'error':
    action.effect==='mqtt'&&(dirty||mqtt.state!=='connected')||action.effect==='serial'&&serial.status!=='connected'?'pending':'ready';
  const testOutput=(draft:CoordinateConfig)=>{
    const sample=new CoordinateSampler(project.mode,draft).step(Array.from({length:project.mode==='hand'?42:project.mode==='face'?478:33},()=>({x:.5,y:.5,z:0})),0);
    if(sample.frame)void send(sample.frame,draft);else setNotice('请先为要输出的手选择检测点。');
  };
  return <main className="object-studio coordinate-workspace">
    <div className="object-toolbar">
      <button className="toolbar-back" aria-label={t('工作空间')} onClick={async()=>{stop();await queue.current;onBack();}}><ArrowLeft size={19}/></button>
      <h1>{project.name}</h1><button className="toolbar-rename" aria-label={t('重命名')} onClick={()=>setRenaming(true)}><Pencil size={15}/></button>
      <span className="tag">{t(project.mode==='hand'?'手部追踪':project.mode==='face'?'面部追踪':'身体追踪')}</span><span className="tag">{t('坐标输出')}</span>{project.mode==='hand'&&<span className="tag">{t(dual?'双手':'单手')}</span>}
      <div className="object-tools">{saved||saveError?<ProjectSaveStatus error={saveError}/>:<span className="save-state" role="status">{t('保存中…')}</span>}
      <button className="secondary small" onClick={download}><Download size={15}/>{t('导出项目')}</button></div>
    </div>
    {(notice||camera.error)&&<p className="object-notice" role="alert">{messageT(notice||camera.error)}<button className="icon-button" aria-label={t('关闭提示')} onClick={()=>{setNotice('');camera.clearError();}}><X size={14}/></button></p>}
    <div className="object-grid coordinate-grid">
      <aside className="object-config"><h2>{t('输出检测点')}</h2>
        {project.mode==='hand'&&<>
          {dual&&<><label className="field">{t('参与输出')}<select aria-label={t('参与输出')} value={config.outputHands??'both'} onChange={e=>edit({coordinates:{...config,outputHands:e.target.value as CoordinateHandOutput}})}><option value="any">{t('单手输出')}</option><option value="both">{t('双手输出')}</option></select></label>{config.outputHands==='any'&&<p className="object-help">{t('短暂遮挡先暂停，不会立即换手。')}</p>}</>}
          {dual&&<div className="coordinate-hand-groups">{[0,1].map(hand=><div key={hand}><button className="coordinate-hand-heading" aria-expanded={editingHand===hand} onClick={()=>setEditingHand(editingHand===hand?-1:hand)}>{t(hand===0?'左手':'右手')} · {t('已选 {0} 点',config.points.filter(id=>Math.floor(id/21)===hand).length)} <span>{editingHand===hand?'▾':'▸'}</span></button></div>)}</div>}
        </>}
        {dual&&<button className="coordinate-all-hands" onClick={()=>updatePoints(Array.from({length:42},(_,id)=>id))}>{t('选择双手全部 42 点')}</button>}
        {(!dual||editingHand>=0)&&<>
          {project.mode==='hand'&&<label className="field coordinate-preset">{t('推荐组合')}<select aria-label={t('推荐组合')} value={presets.find(p=>p.ids.length===selected.length&&p.ids.every(id=>selected.includes(id+offset)))?.key??'custom'} onChange={e=>{const choice=presets.find(p=>p.key===e.target.value);if(choice)preset(choice.ids);}}><option value="custom">{t('自定义')}</option>{presets.map(p=><option key={p.key} value={p.key}>{t(p.label)}</option>)}</select></label>}
          <div className="coordinate-selection-list">{selected.map(id=><div className="coordinate-selection-row" key={id}>
            <button className="coordinate-replace" aria-label={t('替换检测点 {0}',id)} onClick={()=>setPointDialog({replacing:id})}><span>{landmarkLabel(project.mode,dual?id%21:id)}</span><ChevronDown size={15}/></button>
            {config.points.length>1&&<button className="icon-button" aria-label={t('移除检测点 {0}',id)} onClick={()=>select(id)}><X size={14}/></button>}
          </div>)}</div>
          <button className="coordinate-add" aria-label={t('添加检测点')} disabled={config.points.length>=coordinatePointLimit(project.mode,config)} onClick={()=>setPointDialog({})}><Plus size={19}/></button>
        </>}

      </aside>
      <section className="object-camera"><div className="object-camera-title"><h2>{t('实时画面')}</h2><span>{t(camera.state==='on'?'追踪中':camera.state==='opening'?'正在加载模型':'摄像头未开启')}{camera.fallback&&t('· 兼容模式')}</span></div>
        <div className="coordinate-stage" style={{aspectRatio:camera.size.width/camera.size.height,'--coordinate-ratio':camera.size.width/camera.size.height} as React.CSSProperties}>
          <video ref={camera.video} autoPlay muted playsInline/>
          {camera.state==='on'&&<>
            {dual?[0,1].map(hand=><Skeleton key={hand} points={points.slice(hand*21,hand*21+21)} mode="hand"/>):<Skeleton points={points} mode={project.mode} focus={config.points}/>}
            {(!dual||editingHand>=0)&&<PointPicker points={dual?points.slice(offset,offset+21):points} mode={project.mode} selected={selected.map(id=>id-offset)} onSelect={id=>select(id+offset)} pair={false}/>}
            {project.mode==='hand'&&<svg className="coordinate-hand-labels" viewBox="0 0 1000 750" preserveAspectRatio="none">{(dual?[0,1]:[0]).map(hand=>{const wrist=points[hand*21];return wrist&&Number.isFinite(wrist.x)?<text key={hand} x={Math.max(25,Math.min(940,(1-wrist.x)*1000))} y={Math.max(25,Math.min(720,wrist.y*750+30))}>{t((dual?hand===0:coordinateHandSide(points)==='left')?'左':'右')}</text>:null;})}</svg>}
          </>}
          {camera.state!=='on'&&<CameraPlaceholder loading={camera.state==='opening'} hint={project.mode==='hand'?handHint:project.mode==='face'?'正对摄像头，保持面部完整可见，避免过暗的环境。':'后退一些，让肩、髋、手腕和脚踝都进入画面。'} onStart={()=>void camera.start()}/>}
        </div>
        {dual&&<details className="coordinate-test"><summary>{t('双手位置预览')}</summary><div className="coordinate-test-stage">{[0,1].map(hand=>{const point=values?.points.find(p=>Math.floor(p.id/21)===hand);return <span key={hand} className={'coordinate-test-dot hand-'+hand} style={{left:circlePositions[hand].x*100+'%',top:circlePositions[hand].y*100+'%',opacity:point?1:.3}}>{t(hand===0?'左':'右')}</span>;})}</div></details>}
        <div className="object-buttons">{camera.state==='on'&&<button className="secondary" onClick={camera.stop}>{t('关闭摄像头')}</button>}
          <button className="primary" disabled={camera.state!=='on'} onClick={running?stop:start}>{running?<Square size={15}/>:<Play size={15}/>} {t(running?'停止输出':'开始输出')}</button></div>
      </section>
      <aside className="object-output"><h2>{t('实时坐标')}</h2><strong role="status">{t(camera.state==='on'?(values?'追踪中':'追踪丢失，暂停坐标输出'):'等待目标')}</strong>
        <div className="coordinate-table-scroll"><table className="coordinate-table"><thead><tr><th>{t('检测点')}</th>{coordinateAxes(config).map(axis=><th key={axis}>{axis.toUpperCase()}</th>)}</tr></thead><tbody>
          {(dual?[0,1]:[0]).map(hand=>{
            const ids=coordinateOutputIds(config).filter(id=>!dual||Math.floor(id/21)===hand);
            if(!ids.length)return null;
            return <React.Fragment key={hand}>
              {dual&&<tr className="coordinate-table-group"><th colSpan={coordinateAxes(config).length+1}>{t(hand===0?'左手':'右手')}<span>{t(camera.state!=='on'?'等待目标':values?.points.some(p=>Math.floor(p.id/21)===hand)?'追踪中':config.outputHands==='any'&&values?'未参与输出':'暂时丢失，暂停输出')}</span></th></tr>}
              {ids.map(id=>{const point=values?.points.find(p=>p.id===id);return <tr key={id}><th title={coordinateName(project.mode,id,config)}>{landmarkLabel(project.mode,dual?id%21:id)}</th>{coordinateAxes(config).map(axis=><td key={axis}>{point?.[axis]===undefined?'—':point[axis]!.toFixed(3)}</td>)}</tr>;})}
            </React.Fragment>;
          })}
        </tbody></table></div>
        <p className="coordinate-output-status">{t('输出状态')} · {t(running&&!values?'等待目标':output)}</p>
      </aside>
    </div>
    <WorkspaceSettings status={status} sections={[
      {label:'坐标设置',content:<>
        <label className="field">{t('发送频率')}<select value={config.hz} onChange={e=>edit({coordinates:{...config,hz:Number(e.target.value)}})}>{[5,10,15,20,30].map(n=><option value={n} key={n}>{n} Hz</option>)}</select></label>
        <label className="field">{t('坐标平滑')}<select value={config.smoothing} onChange={e=>edit({coordinates:{...config,smoothing:Number(e.target.value)}})}><option value="0">{t('关闭')}</option><option value="0.35">{t('轻度')}</option><option value="0.7">{t('较强')}</option></select></label>
        <p>{t('频率为发送上限，实际受检测速度与连接速度限制。修改设置会停止输出。')}</p><p>{t('Z 使用检测器的相对深度，不代表摄像头距离或厘米。')}</p>
      </>},
      {label:'输出方式',content:<>
        <div className="output-choices" role="group" aria-label={t('输出方式')}>{(['indicator','serial','osc','mqtt'] as const).map(value=><button key={value} className={action.effect===value?'selected':''} aria-pressed={action.effect===value} disabled={running} onClick={()=>{
          if(value!==action.effect){void serial.disconnect();mqtt.reset();editAction({effect:value});}
          if(value!=='indicator')setOutputDialog(true);
        }}>{value==='indicator'?t('仅预览'):value==='serial'?'Serial':value.toUpperCase()}</button>)}</div>
        <p className="object-help">{t('选择输出方式，在窗口中命名检测点并勾选坐标轴。')}</p>
        {action.effect!=='indicator'&&<p>{t('已选 {0} 点',config.points.length)} · {coordinateAxes(config).join(' / ').toUpperCase()}</p>}
        <a href={(import.meta.env?.BASE_URL??'/')+'examples/coordinate_receivers.zip'} download>{t('下载坐标接收案例（五种软件）')}</a>
      </>}

    ]}/>
    {pointDialog&&<CoordinatePointDialog mode={project.mode} offset={offset} points={config.points} limit={coordinatePointLimit(project.mode,config)} replacing={pointDialog.replacing} onApply={applyPoints} onClose={()=>setPointDialog(null)}/>}
    {outputDialog&&<CoordinateOutputDialog mode={project.mode} protocol={action.effect==='serial'?'Serial':action.effect.toUpperCase()} config={config} prefix={osc.address} onClose={()=>setOutputDialog(false)} onApply={coordinates=>edit({coordinates})} connection={draft=><>
      {action.effect==='serial'&&<SerialPanel coordinates output={serial} message={{text:'coordinates',lineEnding:'lf'}} baudRate={project.serialBaudRate??115200} disabled={running} onMessage={()=>{}} onBaudRate={serialBaudRate=>edit({serialBaudRate})} onTest={()=>testOutput(draft)}/>}
      {action.effect==='mqtt'&&<MqttPanel coordinates output={mqtt} config={project.mqtt} value={action.mqtt??{topic:'platform/coordinates',payload:'coordinates',qos:0}} actionId={action.id} disabled={running} onDirtyChange={setDirty} onSave={(broker,message)=>edit({mqtt:broker,actions:[{...action,mqtt:message}]})} onTest={()=>testOutput(draft)}/>}
      {action.effect==='osc'&&<OscPanel coordinates continuous target={osc} onSave={osc=>editAction({osc})} disabled={running} onTest={()=>testOutput(draft)}/>}
      <p className="object-help">{t('测试发送使用 X=0.5、Y=0.5、Z=0。应用后按实际坐标输出。')}</p>
    </>}/>}
    {renaming&&<RenameProjectDialog name={project.name} onClose={()=>setRenaming(false)} onSave={async name=>edit({name})}/>}
  </main>;
}
