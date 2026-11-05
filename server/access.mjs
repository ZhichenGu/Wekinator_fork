import en from '../src/locales/en.json' with {type:'json'};
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';

import {loadUsers,parseUsers,verifyPassword,accountRevision} from './users.mjs';

const COOKIE='motion_access';
const SESSION_MS=12*60*60*1000;
function equal(a,b){const left=createHash('sha256').update(a).digest(),right=createHash('sha256').update(b).digest();return timingSafeEqual(left,right);}
function loginPage(message='',language='zh',accounts=true){
  const t=text=>language==='en'?(en[text]??text):text;
  return `<!doctype html><html lang="${language==='en'?'en':'zh-CN'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t('访问验证')} · Platform</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f5f5;color:#292929;font:14px/1.7 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px}main{width:100%;max-width:360px;background:#fff;border:1px solid #ddd;border-radius:7px;padding:28px}h1{font-size:20px;margin:0 0 10px;font-weight:600}p{font-size:12px;color:#777;margin:0 0 24px}label{display:block;font-size:12px;color:#555}input{display:block;width:100%;font:16px system-ui;padding:10px 12px;margin:8px 0 20px;border:1px solid #bbb;border-radius:5px}button{width:100%;background:#292929;color:#fff;border:0;border-radius:5px;padding:11px;font:14px system-ui;cursor:pointer}input:focus-visible,button:focus-visible{outline:2px solid #555;outline-offset:3px}.error{color:#333;border-left:2px solid #999;padding:8px 10px;background:#f1f1f1;margin-bottom:18px}</style></head><body><main><nav aria-label="Language" style="text-align:right;margin-bottom:12px">🌐 <a lang="zh-CN" href="?lang=zh" style="color:#444">中文</a> / <a lang="en" href="?lang=en" style="color:#444">English</a></nav><h1>${t('访问验证')}</h1><p>${t(accounts?'输入账号和密码后进入。':'输入访问密码后进入。')}</p>${message?`<p class="error" role="alert">${t(message)}</p>`:''}<form method="post" action="/auth/login?lang=${language}">${accounts?`<label for="username">${t('账号')}</label><input id="username" name="username" autocomplete="username" maxlength="48" required autofocus>`:''}<label for="password">${t('访问密码')}</label><input id="password" name="password" type="password" autocomplete="current-password" maxlength="256" required ${accounts?'':'autofocus'}><button type="submit">${t('进入网站')}</button></form></main></body></html>`;
}
export function createAccessGate({password,users,usersFile,secret=process.env.SESSION_SECRET??randomBytes(32).toString('hex'),secureCookie=process.env.AUTH_COOKIE_SECURE==='true'}={}){
  if(!secret||password==='')throw new Error('访问配置和会话签名密钥不能为空。');
  // Explicit password mode exists for isolated legacy tests only. Production always loads the account file.
  const accounts=password===undefined;
  const records=accounts?(users?parseUsers({version:1,users}):loadUsers(usersFile)):[];
  const byName=new Map(records.map(u=>[u.username,u]));
  const revision=name=>accounts?(byName.get(name)?.enabled?accountRevision(byName.get(name)):null):createHash('sha256').update(password).digest('hex');
  const dummy='scrypt-v1$'+'0'.repeat(32)+'$'+'0'.repeat(128);
  const attempts=new Map();const revoked=new Map();
  const token=req=>(req.headers.cookie??'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)??'';
  const sign=value=>createHmac('sha256',secret).update(value).digest('base64url');
  const cookie=(value,maxAge=SESSION_MS/1000)=>`${COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secureCookie?'; Secure':''}`;
  function valid(req){
    const value=token(req);for(const [value,expiry] of revoked)if(expiry<Date.now())revoked.delete(value);
    if(value.length>1024)return false;
    const [expiry,encoded,rev,nonce,signature,...extra]=value.split('.');
    let name;try{name=Buffer.from(encoded??'','base64url').toString('utf8');}catch{return false;}
    return !revoked.has(value)&&!extra.length&&/^\d+$/.test(expiry??'')&&/^[a-f0-9]{32}$/.test(nonce??'')&&Number(expiry)>Date.now()&&Number(expiry)<=Date.now()+SESSION_MS&&rev===revision(name)&&typeof signature==='string'&&equal(signature,sign(`${expiry}.${encoded}.${rev}.${nonce}`));
  }
  function html(res,status,message='',language='zh'){res.writeHead(status,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Set-Cookie':`ui_lang=${language}; Path=/; SameSite=Strict; Max-Age=31536000`});res.end(loginPage(message,language,accounts));}
  function redirect(res,value){res.writeHead(303,{'Location':'/','Set-Cookie':value,'Cache-Control':'no-store'});res.end();}
  const accessGate=async function(req,res,next){
    const url=new URL(req.url??'/','http://localhost');const path=url.pathname;
    // Account records must never be served, even to a signed-in visitor or through Vite's source routes.
    let decoded;try{decoded=decodeURIComponent(path);}catch{res.writeHead(400);res.end();return;}
    if(/(?:^|\/)users\.json(?:$|[/?])/.test(decoded)){res.writeHead(404,{'Cache-Control':'no-store'});res.end();return;}
    const language=(url.searchParams.get('lang')??req.headers.cookie?.match(/(?:^|;\s*)ui_lang=(en|zh)/)?.[1])==='en'?'en':'zh';const page=(status,message='')=>html(res,status,message,language);
    if(path==='/auth/login'&&req.method==='GET'){if(valid(req)){res.writeHead(303,{Location:'/'});res.end();}else page(200);return;}
    if((path==='/auth/login'||path==='/auth/logout')&&req.method==='POST'){
      try{
        if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host){res.writeHead(403,{'Cache-Control':'no-store'});res.end('请求来源不匹配。');return;}
      }catch{res.writeHead(403);res.end();return;}
      if(path==='/auth/logout'){if(valid(req))revoked.set(token(req),Number(token(req).split('.')[0]));redirect(res,cookie('',0));return;}
      const key=req.socket.remoteAddress??'local',now=Date.now();
      const previous=attempts.get(key);const entry=previous&&now-previous.start<300000?previous:{start:now,count:0};
      if(entry.count>=15){page(429,'尝试次数过多，请五分钟后重试。');return;}
      let body='';
      try{for await(const chunk of req){body+=chunk.toString();if(Buffer.byteLength(body)>4096){page(413,'输入过长。');return;}}}catch{return;}
      const form=new URLSearchParams(body),value=form.get('password')??'',name=accounts?(form.get('username')??'').trim():'';
      entry.count++;attempts.set(key,entry);if(attempts.size>1000)for(const [ip,a] of attempts)if(now-a.start>300000)attempts.delete(ip);
      const user=byName.get(name);
      const correct=accounts?await verifyPassword(value,user?.passwordHash??dummy):value.length<=256&&equal(value,password);
      if(!correct||(accounts&&!user?.enabled)){page(401,accounts?'账号或密码不正确。':'密码不正确。');return;}
      attempts.delete(key);const payload=`${now+SESSION_MS}.${Buffer.from(name).toString('base64url')}.${revision(name)}.${randomBytes(16).toString('hex')}`;redirect(res,cookie(`${payload}.${sign(payload)}`));return;
    }
    if(valid(req)){next();return;}
    if(req.method==='GET'&&(path==='/'||req.headers.accept?.includes('text/html'))){page(200);return;}
    res.writeHead(401,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(accounts?'请先登录。':'请先输入访问密码。');
  };
  return Object.assign(accessGate,{isAuthorized:valid});
}
