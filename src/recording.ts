import type {Frame} from './core';
export function recordingQuality(frames:Frame[],expectedMs:number){
 const duration=frames.length>1?frames.at(-1)!.t-frames[0].t:0;
 if(frames.length<10||duration<500)return {valid:false,duration,message:'录制过短或有效采样不足，未保存。请完整做一遍动作，至少保持约 1 秒的连续追踪。'};
 if(!Number.isFinite(expectedMs)||expectedMs<=0||duration<expectedMs*.75||frames.some((f,i)=>!Number.isFinite(f.t)||(i>0&&(f.t<=frames[i-1].t||f.t-frames[i-1].t>220))))return {valid:false,duration,message:'这条示例的追踪不够连续，未保存。请保持目标完整可见，再录一次。'};
 return {valid:true,duration,message:''};
}
