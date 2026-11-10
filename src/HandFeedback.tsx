import {t} from './i18n';
import type {Action,Mode} from './core';

type Props={
  mode:Mode; action?:Action; trained:number; total:number; hasSample:boolean;
  value:number|null; ready:boolean; running:boolean; visible:boolean;
  camera:'off'|'loading'|'on'; recording:boolean; preparing:boolean;
  testing:boolean; testValue:number; testCount:number; evaluating:boolean; reported:boolean;
  outputNeedsAttention:boolean;
};

function guidance(p:Props) {
  if(!p.action)return t('先添加一个目标姿态，并为它指定数值。');
  if(p.evaluating)return t('正在检查这组测试录制。');
  if(p.preparing)return t('保持姿态，倒计时后会自动录制。');
  if(p.recording)return t('保持当前姿态。录好后按空格保存。');
  if(p.testing&&!p.running&&p.reported)return t('查看下方结果，比较每次录制的实际数值与目标。');
  if(p.testing&&!p.running&&p.testCount)return t('可以继续录制其他目标值，或查看这组测试结果。');
  if(p.camera==='loading')return t('正在准备摄像头。');
  if(p.camera==='off')return t(p.mode==='hand'?'开启摄像头，让手掌完整进入取景框。':p.mode==='face'?'开启摄像头，正对镜头。':'开启摄像头，让全身进入取景框。');
  if(!p.visible)return t(p.mode==='hand'?'将手移回取景框，让手指和手腕清晰可见。':p.mode==='face'?'请让面部和所选检测点清晰可见。':'请让身体和所选关节清晰可见。');
  if(p.running)return p.value===null?t('试着回到训练过的姿态，等待有效数值。'):t('在两种姿态间缓慢变化，观察数值是否跟随。');
  if(p.testing)return t('保持目标值 {0} 对应的姿态，按空格录一条。',p.testValue);
  if(!p.hasSample)return t('保持「{0}」，按空格录制目标值 {1}。',p.action.name,p.action.controlValue??0);
  if(!p.action.trained)return t('示范已保存，可以训练「{0}」。',p.action.name);
  if(!p.ready)return t('为另一个不同的数值录制并训练一种可区分的姿态。');
  if(p.outputNeedsAttention)return t('按 P 打开输出设置，检查设备连接。');
  return t('点击「开始运行」，试着从一个姿态过渡到另一个。');
}

export function HandFeedback(props:Props) {
  const {running,value,testing,testValue,action}=props;
  return <aside className="hand-feedback" aria-label={t('实时反馈')}>
    <div className="hand-readout">
      <h2>{t('实时数值')}</h2>
      <output aria-live="off">{running&&value!==null?value.toFixed(3):'—'}</output>
      <meter aria-label={t('实时数值')} min={0} max={1} value={running?(value??0):0}/>
      <div className="hand-scale" aria-hidden="true"><span>0</span><span>1</span></div>
    </div>
    <dl>
      <div><dt>{t('训练进度')}</dt><dd>{t('{0} / {1} 个姿态',props.trained,props.total)}</dd></div>
      {!running&&action&&<div><dt>{t(testing?'测试目标':'当前目标')}</dt><dd>{testing?testValue:t('{0} · {1}',action.name,action.controlValue??0)}</dd></div>}
    </dl>
    <p className="hand-guidance" role="status">{guidance(props)}</p>
  </aside>;
}
