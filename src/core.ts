import {validRelation,type RelationConfig} from './relation';
import {validRegion,type RegionConfig} from './region';
import { validateBroker, validateMqttMessage, type BrokerConfig, type MqttMessage } from './mqtt-output';
import { BAUD_RATES, type SerialMessage } from './serial';
export type Mode = 'hand' | 'face' | 'pose';
export type FeatureMode = 'shape' | 'path' | 'both';
export type Point = { x: number; y: number; z?: number; visibility?: number };
export type Frame = { t: number; points: Point[]; shape: number[]; root: [number, number]; scale: number };
export const MAX_SAMPLES_PER_ACTION = 100;
export type Sample = { id: string; frames: Frame[]; duration: number; negative: boolean; split?: 'train'|'test'; aspectRatio?: number };
export type Action = { id: string; name: string; effect: 'indicator' | 'serial' | 'mqtt'; serial?: SerialMessage; mqtt?: MqttMessage; color: string; samples: Sample[]; trained: boolean; threshold: number; controlValue?:number };
export type Project = { id?:string; schemaVersion: 1; name: string; mode: Mode; feature: FeatureMode; learning?: 'dynamic'|'pose'|'continuous'|'region'|'relation'; relation?:RelationConfig; region?:RegionConfig; poseHoldSeconds?: number; actions: Action[]; mqtt?: BrokerConfig; serialBaudRate?: number; recordingDuration?: number; recordingDelay?: 0|1|3; updatedAt: string };
export type Template = { actionId: string; duration: number; sequence: number[][]; energy: number; negative: boolean };

export function appendSample(action: Action, sample: Sample): Action {
  if(action.samples.length>=MAX_SAMPLES_PER_ACTION)throw new Error(`每个动作最多保留 ${MAX_SAMPLES_PER_ACTION} 次录制，请先删除不需要的录制。`);
  if(action.samples.some(s=>s.id===sample.id))throw new Error('这次录制已经存在。');
  return {...action,samples:[...action.samples,sample],trained:sample.split==='test'?action.trained:false};
}

const dist = (a: number[], b: number[]) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0) / a.length);
const pointDist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export function extract(mode: Mode, points: Point[], blend: number[] = [], t = 0): Frame | null {
  if (points.length < (mode === 'hand' ? 21 : mode === 'pose' ? 33 : 300)) return null;
  if (points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
  let origin: Point, scale: number, selected: Point[];
  if (mode === 'hand') {
    origin = points[0]; scale = pointDist(points[0], points[9]); selected = points;
  } else if (mode === 'pose') {
    const ids = [11,12,13,14,15,16,23,24,25,26,27,28];
    if (ids.some(i => (points[i].visibility ?? 1) < 0.45)) return null;
    origin = {x: (points[23].x + points[24].x) / 2, y: (points[23].y + points[24].y) / 2};
    scale = pointDist(origin, {x: (points[11].x + points[12].x) / 2, y: (points[11].y + points[12].y) / 2});
    selected = ids.map(i => points[i]);
  } else {
    origin = points[1]; scale = pointDist(points[33], points[263]);
    selected = [1,4,33,133,263,362,61,291,13,14,152,10].map(i => points[i]);
  }
  if (scale < .015) return null;
  const geometry = selected.flatMap(p => [(p.x - origin.x) / scale, (p.y - origin.y) / scale]);
  // Facial geometry retains head direction; blendshape coefficients add expression information.
  const shape = mode === 'face' && blend.length ? [...geometry, ...blend.map(v => v * 1.5)] : geometry;
  return {t, points, shape, root: [origin.x, origin.y], scale};
}

export function resample(frames: Frame[], count: number): Frame[] {
  if (frames.length < 2 || count < 2) return [];
  const first = frames[0].t, duration = frames.at(-1)!.t - first;
  if (duration <= 0) return [];
  let j = 0;
  return Array.from({length: count}, (_, i) => {
    const t = first + duration * i / (count - 1);
    while (j < frames.length - 2 && frames[j + 1].t < t) j++;
    const a = frames[j], b = frames[j + 1], u = Math.max(0, Math.min(1, (t-a.t)/(b.t-a.t || 1)));
    return {...a, t, shape: a.shape.map((v,k) => v + (b.shape[k]-v)*u), root: [a.root[0]+(b.root[0]-a.root[0])*u, a.root[1]+(b.root[1]-a.root[1])*u], scale: a.scale+(b.scale-a.scale)*u};
  });
}

export function sequence(frames: Frame[], feature: FeatureMode, count = 60): number[][] {
  const sampled = resample(frames, count);
  if (!sampled.length) return [];
  const scales = frames.map(f => f.scale).sort((a,b) => a-b), scale = scales[Math.floor(scales.length/2)];
  const root = sampled[0].root;
  return sampled.map(f => {
    const path = [(f.root[0]-root[0])/scale, (f.root[1]-root[1])/scale];
    if (feature === 'path') return path;
    if (feature === 'shape') return f.shape;
    // Equal group weight in RMS distance, rather than letting the many shape points dominate.
    const n = f.shape.length;
    return [...f.shape.map(v => v * Math.sqrt((n+2)/(2*n))), ...path.map(v => v * Math.sqrt((n+2)/4))];
  });
}
export function energy(seq: number[][]): number {
  return seq.length ? seq.reduce((sum, f) => sum + dist(f, seq[0]), 0) / seq.length : 0;
}

export function dtw(a: number[][], b: number[][]): number {
  if (!a.length || a.length !== b.length || a[0].length !== b[0].length) return Infinity;
  const n = a.length, costs = Array.from({length:n+1}, () => new Float64Array(n+1).fill(Infinity));
  const lengths = Array.from({length:n+1}, () => new Uint16Array(n+1)); costs[0][0] = 0;
  const band = Math.ceil(n * .22);
  for (let i=1; i<=n; i++) for (let j=Math.max(1,i-band); j<=Math.min(n,i+band); j++) {
    const local = dist(a[i-1], b[j-1]);
    let best = costs[i-1][j-1] + local, len = lengths[i-1][j-1]+1;
    if (i>=2 && costs[i-2][j-1] + local + dist(a[i-2],b[j-1]) < best) {best=costs[i-2][j-1]+local+dist(a[i-2],b[j-1]); len=lengths[i-2][j-1]+2;}
    if (j>=2 && costs[i-1][j-2] + local + dist(a[i-1],b[j-2]) < best) {best=costs[i-1][j-2]+local+dist(a[i-1],b[j-2]); len=lengths[i-1][j-2]+2;}
    costs[i][j]=best; lengths[i][j]=len;
  }
  return costs[n][n] / (lengths[n][n] || 1);
}

export function buildTemplates(actions: Action[], feature: FeatureMode): Template[] {
  const seen=new Set<string>();
  return actions.flatMap(a => !a.trained ? [] : a.samples.filter(s=>s.split!=='test').map(s => {
    const seq = sequence(s.frames, feature);
    return {actionId:a.id, duration:s.duration, sequence:seq, energy:energy(seq), negative:s.negative};
  }).filter(t => {if(!t.sequence.length||t.energy<.025)return false;const key=JSON.stringify([t.actionId,t.negative,t.duration,t.sequence]);if(seen.has(key))return false;seen.add(key);return true;}));
}

export function match(buffer: Frame[], templates: Template[], feature: FeatureMode): Record<string, number> {
  const scores: Record<string, number> = {};
  if (buffer.length < 10) return scores;
  const end = buffer.at(-1)!.t;
  for (const template of templates) {
    if (template.negative) continue;
    let best = 0;
    for (const ratio of [.7,.85,1,1.2,1.5]) {
      const duration = template.duration * ratio, start = end-duration;
      if (buffer[0].t > start + 90) continue;
      const frames = buffer.filter(f => f.t >= start);
      if (frames.length < 10 || frames.at(-1)!.t-frames[0].t < duration*.88) continue;
      if (frames.some((f,i) => i>0 && f.t-frames[i-1].t > 220)) continue;
      const seq = sequence(frames, feature), e = energy(seq);
      if (e < Math.max(.025,template.energy*.4) || e > template.energy*2.5) continue;
      if (dist(seq[0],template.sequence[0]) > .5 || dist(seq.at(-1)!,template.sequence.at(-1)!) > .5) continue;
      const d = dtw(seq, template.sequence);
      const negative = templates.filter(t => t.negative && t.actionId === template.actionId);
      if (negative.some(t => dtw(seq,t.sequence) < d + .025)) continue;
      best = Math.max(best, Math.exp(-d*3));
    }
    scores[template.actionId] = Math.max(scores[template.actionId] ?? 0, best);
  }
  return scores;
}

export class TriggerGate {
  locked = false;
  private lowSince: number | null = null;
  private lastFire = -Infinity;
  reset() { this.locked=false; this.lowSince=null; this.lastFire=-Infinity; }
  update(scores: Record<string,number>, actions: Action[], now: number): string | null {
    const ranked = actions.filter(a=>a.trained).map(a=>({id:a.id,score:scores[a.id]??0,threshold:a.threshold})).sort((a,b)=>b.score-a.score);
    const best = ranked[0];
    if (this.locked) {
      if (!best || best.score < Math.max(.25,best.threshold-.2)) {
        this.lowSince ??= now;
        if (now-this.lowSince>=600 && now-this.lastFire>=1200) {this.locked=false; this.lowSince=null;}
      } else this.lowSince=null;
      return null;
    }
    if (best && best.score>=best.threshold && best.score-(ranked[1]?.score??0)>=.06) {
      this.locked=true;this.lastFire=now;this.lowSince=null;return best.id;
    }
    return null;
  }
}

export function validateProject(data: unknown): Project {
  const p = data as Project;
  if (!p || p.schemaVersion!==1 || typeof p.name!=='string' || !p.name.trim() || p.name.length>80 || !['hand','face','pose'].includes(p.mode) || !['shape','path','both'].includes(p.feature) || !Array.isArray(p.actions) || p.actions.length>12) throw new Error('不是支持的项目文件，或项目版本不兼容。');
  if(p.id!==undefined&&(typeof p.id!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(p.id)))throw new Error('项目标识无效。');
  if(p.learning!==undefined&&!['dynamic','pose','continuous','region','relation'].includes(p.learning))throw new Error('不支持的学习方式。');
  if((p.learning==='region'||p.learning==='relation')&&p.actions.length>1)throw new Error('区域模式只支持一个触发项。');
  if(p.relation!==undefined&&!validRelation(p.relation))throw new Error('关系设置无效。');
  if(p.region!==undefined&&!validRegion(p.region))throw new Error('区域设置无效。');
  if(p.poseHoldSeconds!==undefined&&(!Number.isFinite(p.poseHoldSeconds)||p.poseHoldSeconds<.1||p.poseHoldSeconds>3))throw new Error('姿态确认时间无效。');
  if(p.learning==='pose'||p.learning==='continuous')p.feature='shape';
  if(p.recordingDelay!==undefined&&![0,1,3].includes(p.recordingDelay))throw new Error('录制准备时间无效。');
  if(p.recordingDuration!==undefined&&(!Number.isFinite(p.recordingDuration)||p.recordingDuration<1||p.recordingDuration>6))throw new Error('录制时长无效。');
  if(p.serialBaudRate!==undefined&&!BAUD_RATES.includes(p.serialBaudRate))throw new Error('串口波特率无效。');
  if(p.mqtt!==undefined){if(!p.mqtt||typeof p.mqtt.url!=='string'||typeof p.mqtt.username!=='string'||typeof p.mqtt.clientId!=='string'||typeof p.mqtt.passwordRequired!=='boolean')throw new Error('MQTT 连接配置无效。');p.mqtt=validateBroker(p.mqtt);}
  const ids = new Set<string>();
  for (const a of p.actions) {
    if (!a || typeof a.id!=='string' || ids.has(a.id) || typeof a.name!=='string' || !a.name.trim() || a.name.length>60 || !['indicator','serial','mqtt','scene','pulse'].includes(a.effect) || !/^#[0-9a-f]{6}$/i.test(a.color) || typeof a.trained!=='boolean' || !Number.isFinite(a.threshold) || a.threshold<.5 || a.threshold>.98 || !Array.isArray(a.samples) || a.samples.length>MAX_SAMPLES_PER_ACTION) throw new Error('动作数据不完整或超过限制。');
    if(a.controlValue!==undefined&&(!Number.isFinite(a.controlValue)||a.controlValue<0||a.controlValue>1))throw new Error('目标数值须在 0 到 1 之间。');
    if(a.serial!==undefined&&(!a.serial||typeof a.serial.text!=='string'||a.serial.text.length>512||!['none','lf','crlf'].includes(a.serial.lineEnding)))throw new Error('串口发送配置无效。');
    if(['scene','pulse'].includes(a.effect))a.effect='indicator';
    if(a.mqtt!==undefined)validateMqttMessage(a.mqtt);
    ids.add(a.id);
    let dimension: number | null = null;const sampleIds=new Set<string>();
    for (const s of a.samples) {
      if (!s || typeof s.id!=='string' || typeof s.negative!=='boolean' || !Number.isFinite(s.duration) || s.duration<500 || s.duration>7000 || !Array.isArray(s.frames) || s.frames.length<5 || s.frames.length>300) throw new Error('示例长度无效。');
      if(sampleIds.has(s.id))throw new Error('录制 ID 重复。');sampleIds.add(s.id);
      if(s.split!==undefined&&!['train','test'].includes(s.split))throw new Error('录制用途无效。');
      if(s.aspectRatio!==undefined&&(!Number.isFinite(s.aspectRatio)||s.aspectRatio<.1||s.aspectRatio>10))throw new Error('示例画面比例无效。');
      for (const [i,f] of s.frames.entries()) {
        if (!f || !Number.isFinite(f.t) || (i>0 && f.t<=s.frames[i-1].t) || !Array.isArray(f.shape) || f.shape.length<2 || f.shape.length>200 || f.shape.some(v=>!Number.isFinite(v)) || !Array.isArray(f.root) || f.root.length!==2 || f.root.some(v=>!Number.isFinite(v)) || !Number.isFinite(f.scale) || f.scale<.015 || !Array.isArray(f.points) || f.points.length>500 || f.points.some(pt=>!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y))) throw new Error('示例包含无效坐标或时间戳。');
        dimension ??= f.shape.length;
        if (f.shape.length!==dimension) throw new Error('示例的特征维度不一致，请重新录制。');
      }
      if (Math.abs(s.frames.at(-1)!.t-s.frames[0].t-s.duration)>100) throw new Error('示例时长与时间戳不一致。');
    }
  }
  return p;
}
