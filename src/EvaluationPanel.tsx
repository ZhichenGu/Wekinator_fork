import {ConfusionReview} from './ConfusionReview';
import {ValueResults} from './ValueResults';
import type {Project} from './core';
import type {ValueReport} from './continuous-check';
import {t, messageT} from './i18n';
import type {EvaluationReport,TrialOutcome} from './evaluation';
export const OUTCOMES:Record<TrialOutcome,string>={correct:'一次正确触发',miss:'未触发',confused:'触发了其他类别',extra:'重复触发',rejected:'正确保持无触发',falsePositive:'误触发',leakage:'与训练重复 · 剔除',duplicate:'测试重复 · 剔除',invalid:'数据无效 · 剔除'};
export const tips:Partial<Record<TrialOutcome,string>> = {
  "miss": "回放时检查动作是否完整。如果这种做法在训练中很少出现，另录一条训练示范。",
  "confused": "对照实际触发的类别，检查当前关注点能否区分这两种动作。",
  "extra": "对照触发时刻，检查一次录制中是否重复做了动作。",
  "falsePositive": "观察误触时的姿态。如果尝试提高阈值，复测时同时检查正例是否漏检。"
};
const percent=(n:number,total:number)=>total?`${(n/total*100).toFixed(2)}%`:t('未测试');
export function EvaluationPanel({project,valueReport,testRound,locked,report,busy,progress,total,ready,onReplay,onRun,onCancel,onExport}:{project:Project;valueReport:ValueReport|null;testRound?:number;locked?:boolean;report:EvaluationReport|null;busy:boolean;progress:{done:number;total:number};total:number;ready:boolean;onReplay:(actionId:string,sampleId:string)=>void;onRun:()=>void;onCancel:()=>void;onExport:()=>void}){
  const failures = report?.trials.filter(trial => tips[trial.outcome]) ?? [];
  return <div className="evaluation-panel">
    <div className="evaluation-heading"><div><h3>{t("独立测试")}</h3><p>{t("使用未参与训练的新录制检查结果。测试不会发送 Serial 或 MQTT。")}</p></div>{busy?<button className="secondary small" onClick={onCancel}>{t("取消测试")}</button>:<button className="primary small" disabled={locked||!total||!ready} onClick={onRun}>{t(testRound?"查看本轮结果":"运行独立测试")}</button>}</div>
    {busy&&<p role="status">{t("正在检查")}{progress.done} / {progress.total||total}{t("条测试录制…")}</p>}
    {!busy&&!report&&!valueReport&&<div className="evaluation-empty"><p>{!total&&testRound?t("请先在新位置录一条测试动作。"):!total&&project.learning==='continuous'?t("训练好两个目标数值后，开始新一轮测试并分别录制三个目标值。"):!total?t("在右侧将“录制用途”设为“独立测试”，为各动作重新录制；也可将现有录制移入测试集后重新训练。"):!ready?t("请先完成训练，再运行独立测试。"):t("已有 {0} 条独立测试录制，可以开始检查。", total)}</p><p>{t("复制的训练数据或重复的测试数据会被剔除，不计入通过比例。")}</p></div>}
    {valueReport&&<><ValueResults report={valueReport}/><button className="secondary small" onClick={onExport}>{t("导出测试报告")}</button></>}
    {report&&<>
      <div className="evaluation-summary"><div><strong>{report.positiveCorrect} / {report.positiveCount}</strong><span>{t("正例一次正确触发 ·")}{percent(report.positiveCorrect,report.positiveCount)}</span></div><div><strong>{report.negativeCorrect} / {report.negativeCount}</strong><span>{t("负例保持无触发 ·")}{percent(report.negativeCorrect,report.negativeCount)}</span></div><div><strong>{report.skipped}</strong><span>{t("剔除重复或无效录制")}</span></div></div>
      <p className="evaluation-caveat">{t("仅对应本次有效测试录制，不是匹配分数，也不保证其他场景的准确率。")}</p>
      <div className="evaluation-counts"><span>{t("漏检样本：")}{report.misses}</span><span>{t("混淆样本：")}{report.confused}</span><span>{t("重复触发样本：")}{report.extra}</span><span>{t("负例误触发：")}{report.negativeCount?report.falseTriggers+t("次"):t("未测试")}{report.negativeMinutes>0?t(" / {0} 分钟", report.negativeMinutes.toFixed(2)):''}</span></div>
      {failures.length>0&&<details className="evaluation-issues" open><summary><i aria-hidden="true"/>{t('建议检查的录制（{0}）', failures.length)}</summary>
        {failures.map(trial=><div className="evaluation-issue" key={trial.actionId+':'+trial.sampleId}><strong>{trial.actionName} · {t(OUTCOMES[trial.outcome])}</strong>
          {trial.events.length>0&&<small>{trial.events.map(event=>t('{0} @ {1} 秒',event.name,(event.atMs/1000).toFixed(2))).join(' · ')}</small>}
          <p>{t(tips[trial.outcome]!)}</p><button className="secondary small" onClick={()=>onReplay(trial.actionId,trial.sampleId)}>{t('回放这条录制')}</button><ConfusionReview project={project} trial={trial} group={report.trials}/></div>)}
      </details>}
      <div className="table-scroll"><table><caption>{t("各类别独立正例")}</caption><thead><tr><th>{t("类别")}</th><th>{t("有效测试")}</th><th>{t("一次正确")}</th><th>{t("漏检条数")}</th><th>{t("多触发次数")}</th><th>{t("通过比例")}</th></tr></thead><tbody>{report.perAction.map(a=><tr key={a.id}><td>{a.name}</td><td>{a.tested}</td><td>{a.correct}</td><td>{a.tested?a.missed:"—"}</td><td>{a.tested?a.repeated:"—"}</td><td>{percent(a.correct,a.tested)}</td></tr>)}</tbody></table></div>
      {!!report.confusion.length&&<details><summary>{t("查看类别混淆（每条录制的首次触发）")}</summary><div className="table-scroll"><table><thead><tr><th>{t("预期")}</th><th>{t("首次触发")}</th><th>{t("条数")}</th></tr></thead><tbody>{report.confusion.map((c,i)=><tr key={i}><td>{c.expected}</td><td>{c.predicted}</td><td>{c.count}</td></tr>)}</tbody></table></div></details>}
      <details><summary>{t("逐条测试结果")}</summary><div className="trial-list">{report.trials.map((trial,i)=><div key={`${trial.actionId}-${trial.sampleId}-${i}`}><strong>{trial.actionName} · {trial.expectedId?t("正例"):t("不应触发")}</strong><span>{messageT(OUTCOMES[trial.outcome])}</span><p>{trial.reason?messageT(trial.reason):(trial.events.length?trial.events.map(e=>t("{0} @ {1} 秒", e.name, (e.atMs/1000).toFixed(2))).join('；'):t("无触发"))}</p></div>)}</div><p className="evaluation-caveat">{t("触发时刻从测试录制开始计时，不等于动作完成后的延迟。")}</p></details>
      <button className="secondary small" onClick={onExport}>{t("导出测试报告")}</button>
    </>}
  </div>;
}
