import {useState} from 'react';
import type {Project, Sample} from './core';
import type {TrialResult} from './evaluation';
import {SampleEditor} from './SampleEditor';
import {t} from './i18n';

export function ConfusionReview({project,trial,group}:{project:Project;trial:TrialResult;group:TrialResult[]}) {
  const [reference,setReference]=useState<{sample:Sample;name:string}|null>(null);
  if(trial.outcome!=='confused') return null;
  const clip=project.actions.find(a=>a.id===trial.actionId)?.samples.find(s=>s.id===trial.sampleId);
  if(!clip) return null;
  const otherIds=[...new Set(trial.events.map(e=>e.id).filter(id=>id!==trial.actionId))];
  return <div className="confusion-review">{otherIds.map(id=>{
    const action=project.actions.find(a=>a.id===id);
    const example=action?.samples.find(s=>s.split!=='test'&&!s.negative);
    if(!action||!example) return null;
    const count=group.filter(row=>row.expectedId===trial.expectedId&&row.events.some(e=>e.id===id)).length;
    return <div key={id}>
      <p>{t('预期「{0}」，触发「{1}」 · {2} 条录制',trial.actionName,action.name,count)}</p>
      <button className="secondary small" onClick={()=>setReference({sample:example,name:action.name})}>{t('与「{0}」的训练示范对照',action.name)}</button>
      {count>=2&&<p>{t(project.learning==='pose'?'多条录制出现同一混淆。对照两种姿态，看看哪些关节的位置可以区分它们。':'多条录制出现同一混淆。若两者姿态接近，可单独试轨迹特征；若路径接近，可单独试形状特征，再用同一轮录制复测。')}</p>}
    </div>;
  })}{reference&&<SampleEditor sample={clip} mode={project.mode} comparison={reference} label={trial.actionName} onClose={()=>setReference(null)}/>}</div>;
}
