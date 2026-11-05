import en from './locales/en.json';
export type Language='zh'|'en';
const dictionary:Record<string,string>=en;
export function parseLanguage(value:unknown):Language{return value==='en'?'en':'zh';}
let language:Language='zh';
try{if(typeof window!=='undefined')language=parseLanguage(document.cookie.match(/(?:^|;\s*)ui_lang=(en|zh)/)?.[1]??localStorage.getItem('motion-language'));}catch{}
const listeners=new Set<()=>void>();
export function getLanguage(){return language;}
export function subscribeLanguage(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};}
export function setLanguage(next:Language){language=parseLanguage(next);try{localStorage.setItem('motion-language',language);}catch{}if(typeof document!=='undefined'){document.documentElement.lang=language==='zh'?'zh-CN':'en';document.cookie=`ui_lang=${language}; Path=/; SameSite=Strict; Max-Age=31536000${location.protocol==='https:'?'; Secure':''}`;document.title=language==='zh'?'摄像头动作学习':'Camera motion learning';}for(const fn of listeners)fn();}
export function t(source:string,...values:unknown[]){const text=language==='en'?(dictionary[source]??source):source;return text.replace(/\{(\d+)\}/g,(_,n)=>String(values[+n]??`{${n}}`));}
const patterns=Object.entries(dictionary).filter(([k])=>/\{\d+\}/.test(k)&&/[\u3400-\u9fff]/.test(k)).map(([key,value])=>{const parts=key.split(/(\{\d+\})/g);return {key,value,regex:new RegExp('^'+parts.map(p=>/^\{\d+\}$/.test(p)?'([\\s\\S]*?)':p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('')+'$')};});
// Called only for application messages, never for project names, target labels or payloads.
export function messageT(message:string):string{if(language==='zh'||!message)return message;if(dictionary[message])return dictionary[message];for(const p of patterns){const match=message.match(p.regex);if(match)return p.value.replace(/\{(\d+)\}/g,(_,n)=>match[+n+1]??'');}return message.split(/(“[^”]*”|"[^"]*")/g).map((part,i)=>i%2?part:Object.entries(dictionary).filter(([key])=>!key.includes('{')&&key.length>=4).sort((a,b)=>b[0].length-a[0].length).reduce((text,[zh,en])=>text.split(zh).join(en),part)).join('');}
