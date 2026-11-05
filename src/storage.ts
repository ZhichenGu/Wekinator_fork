import type {Project} from './core';
import {withProjectId} from './catalog';
function open():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const req=indexedDB.open('motion-studio',1);req.onupgradeneeded=()=>req.result.createObjectStore('projects');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
let pending:Promise<unknown>=Promise.resolve();
function transaction<T>(work:(store:IDBObjectStore,done:(v:T)=>void)=>void):Promise<T>{
 const task=pending.catch(()=>{}).then(async()=>{const db=await open();try{return await new Promise<T>((resolve,reject)=>{let value:T;const tx=db.transaction('projects','readwrite');tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);try{work(tx.objectStore('projects'),v=>{value=v;});}catch(e){tx.abort();reject(e);}});}finally{db.close();}});pending=task;return task;
}
function catalog(store:IDBObjectStore,done:(items:Project[])=>void){const req=store.getAll();req.onsuccess=()=>{const values=req.result as Project[],projects=new Map<string,Project>();for(const raw of values){const p=withProjectId(raw);if(!raw.id){store.put(p,'current');store.put(p,'tracking:'+p.id);}projects.set(p.id,p);}done([...projects.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));};}
export function listProjects():Promise<Project[]>{return transaction((store,done)=>catalog(store,done));}
export function saveProject(project:Project):Promise<Project>{const p=withProjectId(project);return transaction((store,done)=>{store.put(p,'tracking:'+p.id);store.put(p,'current');done(p);});}
export function deleteProject(id?:string):Promise<void>{return transaction((store,done)=>{catalog(store,items=>{const current=store.get('current');current.onsuccess=()=>{const target=id??(current.result as Project|undefined)?.id;if(target){store.delete('tracking:'+target);if((current.result as Project|undefined)?.id===target){const next=items.find(p=>p.id!==target);if(next)store.put(next,'current');else store.delete('current');}}done();};});});}
export async function loadProject():Promise<Project|undefined>{const projects=await listProjects();return projects[0];}
