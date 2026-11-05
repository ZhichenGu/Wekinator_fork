import {scrypt as derive,randomBytes,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {readFileSync} from 'node:fs';
const scrypt=promisify(derive);
export const DEFAULT_USERS_FILE=new URL('../config/users.json',import.meta.url);
const HASH=/^scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{128})$/;
export function usernameValid(value){return typeof value==='string'&&/^[A-Za-z0-9_.-]{1,48}$/.test(value);}
export function parseUsers(raw){
 if(!raw||raw.version!==1||!Array.isArray(raw.users)||raw.users.length>200)throw new Error('账号文件格式不正确（version: 1，users 数组，最多 200 个账号）。');
 const names=new Set();
 return raw.users.map(u=>{if(!u||!usernameValid(u.username)||names.has(u.username)||typeof u.enabled!=='boolean'||!HASH.test(u.passwordHash??'')||typeof u.sessionVersion!=='string'||!/^[a-f0-9]{32}$/.test(u.sessionVersion))throw new Error('账号记录无效或名称重复。请使用 npm run users 管理账号。');names.add(u.username);return {username:u.username,passwordHash:u.passwordHash,enabled:u.enabled,sessionVersion:u.sessionVersion};});
}
export function loadUsers(file=DEFAULT_USERS_FILE){try{const text=readFileSync(file,'utf8');if(Buffer.byteLength(text)>256000)throw new Error();return parseUsers(JSON.parse(text));}catch{throw new Error('无法读取有效的账号文件 config/users.json。请修复文件后重启；不会回退为共用密码。');}}
export async function hashPassword(password){if(typeof password!=='string'||password.length<1||password.length>256)throw new Error('密码长度须为 1–256 个字符。');const salt=randomBytes(16).toString('hex');const key=await scrypt(password,salt,64,{N:16384,r:8,p:1,maxmem:32*1024*1024});return `scrypt-v1$${salt}$${key.toString('hex')}`;}
export async function verifyPassword(password,encoded){const m=HASH.exec(encoded??'');if(!m||typeof password!=='string'||password.length>256)return false;const key=await scrypt(password,m[1],64,{N:16384,r:8,p:1,maxmem:32*1024*1024});return timingSafeEqual(key,Buffer.from(m[2],'hex'));}
export function accountRevision(user){return createHash('sha256').update(JSON.stringify(user)).digest('hex');}
export async function setAccount(config,username,password){if(!usernameValid(username))throw new Error('账号请使用 1–48 位英文字母、数字、点、横线或下划线，区分大小写。');const users=parseUsers(config),passwordHash=await hashPassword(password),user={username,passwordHash,enabled:true,sessionVersion:randomBytes(16).toString('hex')};const result={version:1,users:[...users.filter(u=>u.username!==username),user]};parseUsers(result);return result;}
export function setAccountEnabled(config,username,enabled){const users=parseUsers(config);if(!users.some(u=>u.username===username))throw new Error('账号不存在。');return {version:1,users:users.map(u=>u.username===username?{...u,enabled,sessionVersion:randomBytes(16).toString('hex')}:u)};}
