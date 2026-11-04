import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';

const COOKIE='motion_access';
const SESSION_MS=12*60*60*1000;
function equal(a,b){const left=createHash('sha256').update(a).digest(),right=createHash('sha256').update(b).digest();return timingSafeEqual(left,right);}
function loginPage(message=''){
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>访问验证 · 动作学习</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f5f5;color:#292929;font:14px/1.7 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px}main{width:100%;max-width:360px;background:#fff;border:1px solid #ddd;border-radius:7px;padding:28px}h1{font-size:20px;margin:0 0 10px;font-weight:600}p{font-size:12px;color:#777;margin:0 0 24px}label{display:block;font-size:12px;color:#555}input{display:block;width:100%;font:16px system-ui;padding:10px 12px;margin:8px 0 20px;border:1px solid #bbb;border-radius:5px}button{width:100%;background:#292929;color:#fff;border:0;border-radius:5px;padding:11px;font:14px system-ui;cursor:pointer}input:focus-visible,button:focus-visible{outline:2px solid #555;outline-offset:3px}.error{color:#333;border-left:2px solid #999;padding:8px 10px;background:#f1f1f1;margin-bottom:18px}</style></head><body><main><h1>访问验证</h1><p>输入访问密码后进入。</p>${message?`<p class="error" role="alert">${message}</p>`:''}<form method="post" action="/auth/login"><label for="password">访问密码</label><input id="password" name="password" type="password" autocomplete="current-password" maxlength="256" required autofocus><button type="submit">进入网站</button></form></main></body></html>`;
}
export function createAccessGate({password=process.env.APP_PASSWORD??'0000',secret=process.env.SESSION_SECRET??randomBytes(32).toString('hex'),secureCookie=process.env.AUTH_COOKIE_SECURE==='true'}={}){
  if(!password||!secret)throw new Error('访问密码和会话签名密钥不能为空。');
  const attempts=new Map();const revoked=new Map();
  const token=req=>(req.headers.cookie??'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)??'';
  const sign=value=>createHmac('sha256',secret).update(value).digest('base64url');
  const cookie=(value,maxAge=SESSION_MS/1000)=>`${COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secureCookie?'; Secure':''}`;
  function valid(req){
    const value=token(req);for(const [value,expiry] of revoked)if(expiry<Date.now())revoked.delete(value);
    const [expiry,nonce,signature,...extra]=value.split('.');
    return !revoked.has(value)&&!extra.length&&/^\d+$/.test(expiry??'')&&/^[a-f0-9]{32}$/.test(nonce??'')&&Number(expiry)>Date.now()&&Number(expiry)<=Date.now()+SESSION_MS&&typeof signature==='string'&&equal(signature,sign(`${expiry}.${nonce}`));
  }
  function html(res,status,message=''){res.writeHead(status,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});res.end(loginPage(message));}
  function redirect(res,value){res.writeHead(303,{'Location':'/','Set-Cookie':value,'Cache-Control':'no-store'});res.end();}
  const accessGate=async function(req,res,next){
    const path=new URL(req.url??'/','http://localhost').pathname;
    if(path==='/auth/login'&&req.method==='GET'){if(valid(req)){res.writeHead(303,{Location:'/'});res.end();}else html(res,200);return;}
    if((path==='/auth/login'||path==='/auth/logout')&&req.method==='POST'){
      try{
        if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host){res.writeHead(403,{'Cache-Control':'no-store'});res.end('请求来源不匹配。');return;}
      }catch{res.writeHead(403);res.end();return;}
      if(path==='/auth/logout'){if(valid(req))revoked.set(token(req),Number(token(req).split('.')[0]));redirect(res,cookie('',0));return;}
      const key=req.socket.remoteAddress??'local',now=Date.now();
      const previous=attempts.get(key);const entry=previous&&now-previous.start<300000?previous:{start:now,count:0};
      if(entry.count>=15){html(res,429,'尝试次数过多，请五分钟后重试。');return;}
      let body='';
      try{for await(const chunk of req){body+=chunk.toString();if(Buffer.byteLength(body)>2048){html(res,413,'输入过长。');return;}}}catch{return;}
      const value=new URLSearchParams(body).get('password')??'';
      if(value.length>256||!equal(value,password)){entry.count++;attempts.set(key,entry);if(attempts.size>1000)for(const [ip,a] of attempts)if(now-a.start>300000)attempts.delete(ip);html(res,401,'密码不正确。');return;}
      attempts.delete(key);const payload=`${now+SESSION_MS}.${randomBytes(16).toString('hex')}`;redirect(res,cookie(`${payload}.${sign(payload)}`));return;
    }
    if(valid(req)){next();return;}
    if(req.method==='GET'&&(path==='/'||req.headers.accept?.includes('text/html'))){html(res,200);return;}
    res.writeHead(401,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end('请先输入访问密码。');
  };
  return Object.assign(accessGate,{isAuthorized:valid});
}
