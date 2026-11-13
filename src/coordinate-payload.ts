// Larger frames are permitted only on the coordinate-output path.
export const COORDINATE_PAYLOAD_LIMIT=8192;
export function validateCoordinatePayload(text:string):void {
  if(typeof text!=='string'||text.length>COORDINATE_PAYLOAD_LIMIT)throw Error('坐标消息过长。');
  let frame;try{frame=JSON.parse(text);}catch{throw Error('坐标消息无效。');}
  if(!frame||!['hand','face','pose'].includes(frame.mode)||!Number.isFinite(frame.t))throw Error('坐标消息无效。');
  if(frame.values){
    const entries=Object.entries(frame.values);
    if(Array.isArray(frame.values)||!entries.length||entries.length>126||entries.some(([key,value])=>!/^[A-Za-z][A-Za-z0-9_]{0,15}_[xyz]$/.test(key)||!Number.isFinite(value)))throw Error('坐标消息无效。');
  }else{
    if(!Array.isArray(frame.points)||!frame.points.length||frame.points.length>42||new Set(frame.points.map((p:{id:number})=>p?.id)).size!==frame.points.length||frame.points.some((p:{id:number;x:number;y:number;z?:number})=>!p||!Number.isInteger(p.id)||p.id<0||p.id>477||!Number.isFinite(p.x)||!Number.isFinite(p.y)||(p.z!==undefined&&!Number.isFinite(p.z))))throw Error('坐标消息无效。');
  }
}
