import {createHmac} from 'node:crypto';
const HOST='iat-api.xfyun.cn';
export function xfyunUrl(apiKey,apiSecret,date=new Date().toUTCString()){
 const signature=createHmac('sha256',apiSecret).update(`host: ${HOST}\ndate: ${date}\nGET /v2/iat HTTP/1.1`).digest('base64');
 const authorization=Buffer.from(`api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`).toString('base64');
 const url=new URL(`wss://${HOST}/v2/iat`);url.search=new URLSearchParams({authorization,date,host:HOST}).toString();return url.href;
}
export function pcm16k(wav){const rate=wav.readUInt32LE(24),count=(wav.length-44)/2,length=Math.floor(count*16000/rate),pcm=Buffer.alloc(length*2);for(let i=0;i<length;i++){const start=i*rate/16000,end=Math.min(count,(i+1)*rate/16000);let sum=0,weight=0;for(let j=Math.floor(start);j<Math.ceil(end);j++){const w=Math.min(end,j+1)-Math.max(start,j);if(w>0){sum+=wav.readInt16LE(44+j*2)*w;weight+=w;}}pcm.writeInt16LE(Math.max(-32768,Math.min(32767,Math.round(sum/(weight||1)))),i*2);}return pcm;}
export function transcribeXfyun({appId,apiKey,apiSecret,language='zh_cn',wav,signal},{socketFactory=url=>new WebSocket(url),frameMs=40}={}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(new Error('cancelled'));return;}
  let socket,settled=false,offset=0,timer;const parts=new Map(),pcm=pcm16k(wav);
  const fail=()=>finish(new Error('讯飞听写失败，请检查凭证、语音听写服务与额度。'));
  function finish(error,text){if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);try{socket?.close();}catch{}error?reject(error):resolve(text);}
  const cancel=()=>finish(new Error('请求超时或已停止，本次不输出。'));
  try{socket=socketFactory(xfyunUrl(apiKey,apiSecret));}catch{fail();return;}
  signal?.addEventListener('abort',cancel,{once:true});
  socket.addEventListener('open',()=>{function send(){if(settled)return;try{if(offset>=pcm.length){socket.send(JSON.stringify({data:{status:2}}));return;}const first=offset===0,chunk=pcm.subarray(offset,offset+1280);socket.send(JSON.stringify({...first?{common:{app_id:appId},business:{language,domain:'iat',...language==='zh_cn'?{accent:'mandarin'}:{}}}:{},data:{status:first?0:1,format:'audio/L16;rate=16000',encoding:'raw',audio:chunk.toString('base64')}}));offset+=chunk.length;timer=setTimeout(send,frameMs);}catch{fail();}}send();});
  socket.addEventListener('message',event=>{if(settled)return;try{if(typeof event.data!=='string'||event.data.length>100000)throw new Error();const body=JSON.parse(event.data);if(body.code!==0)throw new Error();const r=body.data?.result;if(r){if(!Number.isInteger(r.sn)||r.sn<0||r.sn>1000||!Array.isArray(r.ws))throw new Error();const text=r.ws.map(w=>{if(typeof w?.cw?.[0]?.w!=='string')throw new Error();return w.cw[0].w;}).join('');if(r.pgs==='rpl'){if(!Array.isArray(r.rg)||r.rg.length!==2||!r.rg.every(Number.isInteger)||r.rg[0]<0||r.rg[1]>1000||r.rg[1]<r.rg[0])throw new Error();for(let n=r.rg[0];n<=r.rg[1];n++)parts.delete(n);}parts.set(r.sn,text);}const text=[...parts].sort((a,b)=>a[0]-b[0]).map(p=>p[1]).join('');if(text.length>20000)throw new Error();if(body.data?.status===2){if(!parts.size)throw new Error();finish(null,text);}}catch{fail();}});
  socket.addEventListener('error',fail);socket.addEventListener('close',()=>{if(!settled)fail();});
 });
}
export function checkXfyun({apiKey,apiSecret,signal},{socketFactory=url=>new WebSocket(url)}={}){return new Promise((resolve,reject)=>{if(signal?.aborted){reject(new Error('cancelled'));return;}let socket,done=false;const finish=error=>{if(done)return;done=true;signal?.removeEventListener('abort',cancel);try{socket?.close();}catch{}error?reject(new Error('讯飞凭证验证失败。')):resolve();};const cancel=()=>finish(true);try{socket=socketFactory(xfyunUrl(apiKey,apiSecret));}catch{finish(true);return;}signal?.addEventListener('abort',cancel,{once:true});socket.addEventListener('open',()=>finish(false));socket.addEventListener('error',()=>finish(true));socket.addEventListener('close',()=>{if(!done)finish(true);});});}
