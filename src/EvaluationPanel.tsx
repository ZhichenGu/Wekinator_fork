import type {EvaluationReport,TrialOutcome} from './evaluation';
const OUTCOMES:Record<TrialOutcome,string>={correct:'一次正确触发',miss:'未触发',confused:'触发了其他类别',extra:'重复触发',rejected:'正确保持无触发',falsePositive:'误触发',leakage:'与训练重复 · 剔除',duplicate:'测试重复 · 剔除',invalid:'数据无效 · 剔除'};
const percent=(n:number,total:number)=>total?`${(n/total*100).toFixed(2)}%`:'未测试';
export function EvaluationPanel({report,busy,progress,total,ready,onRun,onCancel,onExport}:{report:EvaluationReport|null;busy:boolean;progress:{done:number;total:number};total:number;ready:boolean;onRun:()=>void;onCancel:()=>void;onExport:()=>void}){
  return <div className="evaluation-panel">
    <div className="evaluation-heading"><div><h3>独立测试</h3><p>使用未参与训练的新录制检查结果。测试不会发送 Serial 或 MQTT。</p></div>{busy?<button className="secondary small" onClick={onCancel}>取消测试</button>:<button className="primary small" disabled={!total||!ready} onClick={onRun}>运行独立测试</button>}</div>
    {busy&&<p role="status">正在检查 {progress.done} / {progress.total||total} 条测试录制…</p>}
    {!busy&&!report&&<div className="evaluation-empty"><p>{!total?'在右侧将“录制用途”设为“独立测试”，为各动作重新录制；也可将现有录制移入测试集后重新训练。':!ready?'请先完成训练，再运行独立测试。':`已有 ${total} 条独立测试录制，可以开始检查。`}</p><p>复制的训练数据或重复的测试数据会被剔除，不计入通过比例。</p></div>}
    {report&&<>
      <div className="evaluation-summary"><div><strong>{report.positiveCorrect} / {report.positiveCount}</strong><span>正例一次正确触发 · {percent(report.positiveCorrect,report.positiveCount)}</span></div><div><strong>{report.negativeCorrect} / {report.negativeCount}</strong><span>负例保持无触发 · {percent(report.negativeCorrect,report.negativeCount)}</span></div><div><strong>{report.skipped}</strong><span>剔除重复或无效录制</span></div></div>
      <p className="evaluation-caveat">仅对应本次有效测试录制，不是匹配分数，也不保证其他场景的准确率。</p>
      <div className="evaluation-counts"><span>漏检样本：{report.misses}</span><span>混淆样本：{report.confused}</span><span>重复触发样本：{report.extra}</span><span>负例误触发：{report.falseTriggers} 次{report.negativeMinutes>0?` / ${report.negativeMinutes.toFixed(2)} 分钟`:''}</span></div>
      <div className="table-scroll"><table><caption>各类别独立正例</caption><thead><tr><th>类别</th><th>有效测试</th><th>一次正确</th><th>通过比例</th></tr></thead><tbody>{report.perAction.map(a=><tr key={a.id}><td>{a.name}</td><td>{a.tested}</td><td>{a.correct}</td><td>{percent(a.correct,a.tested)}</td></tr>)}</tbody></table></div>
      {!!report.confusion.length&&<details><summary>查看类别混淆（每条录制的首次触发）</summary><div className="table-scroll"><table><thead><tr><th>预期</th><th>首次触发</th><th>条数</th></tr></thead><tbody>{report.confusion.map((c,i)=><tr key={i}><td>{c.expected}</td><td>{c.predicted}</td><td>{c.count}</td></tr>)}</tbody></table></div></details>}
      <details><summary>逐条测试结果</summary><div className="trial-list">{report.trials.map((t,i)=><div key={`${t.actionId}-${t.sampleId}-${i}`}><strong>{t.actionName} · {t.expectedId?'正例':'不应触发'}</strong><span>{OUTCOMES[t.outcome]}</span><p>{t.reason??(t.events.length?t.events.map(e=>`${e.name} @ ${(e.atMs/1000).toFixed(2)} 秒`).join('；'):'无触发')}</p></div>)}</div><p className="evaluation-caveat">触发时刻从测试录制开始计时，不等于动作完成后的延迟。</p></details>
      <button className="secondary small" onClick={onExport}>导出测试报告</button>
    </>}
  </div>;
}
