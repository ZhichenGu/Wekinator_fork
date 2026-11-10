import {t} from './i18n';
import type {ValueReport} from './continuous-check';

export function ValueResults({report}:{report:ValueReport}) {
  const format=(value:number|null)=>value===null?'—':value.toFixed(3);
  const reasons={missingTarget:'缺少录制时的目标值',trainingCopy:'与训练重复 · 剔除',testCopy:'测试重复 · 剔除'};
  return <>
    <div className="table-scroll"><table><caption>{t('连续数值检查')}</caption>
      <thead><tr>{['测试轮次','目标值','输出中位数','绝对偏差','波动幅度','有效输出'].map(label=><th key={label}>{t(label)}</th>)}</tr></thead>
      <tbody>{report.trials.map(row=><tr key={JSON.stringify([row.actionId,row.sampleId])}>
        <td>{row.round??'—'}</td><td>{row.target??'—'}</td>
        {row.excluded?<td colSpan={4}>{t(reasons[row.excluded])}</td>:<>
          <td>{format(row.median)}</td><td>{format(row.error)}</td><td>{format(row.spread)}</td>
          <td>{Math.round(100*row.valid/row.total)}% ({row.valid}/{row.total})</td></>}
      </tr>)}</tbody>
    </table></div>
    <p className="evaluation-caveat">{t('每行是一条录制。绝对偏差是中位数与目标的距离；波动幅度取有效数值的第 90 与第 10 百分位之差。有效输出按采样次数计算，含追踪丢失。')}</p>
  </>;
}
