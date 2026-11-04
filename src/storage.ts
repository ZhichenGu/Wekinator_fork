import type { Project } from './core';
function open(): Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open('motion-studio',1);
    req.onupgradeneeded=()=>req.result.createObjectStore('projects');
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
}
// Serialize writes so a pending autosave cannot resurrect a deleted project.
let pending: Promise<void> = Promise.resolve();
function mutate(value:Project|null):Promise<void> {
  const task=pending.catch(()=>{}).then(async()=>{
    const db=await open();
    try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('projects','readwrite');const store=tx.objectStore('projects');if(value)store.put(value,'current');else store.delete('current');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}
  });
  pending=task;return task;
}
export function saveProject(project:Project):Promise<void>{return mutate(project);}
export function deleteProject():Promise<void>{return mutate(null);}
export async function loadProject(): Promise<Project | undefined> {
  const db=await open();
  try {return await new Promise<Project|undefined>((resolve,reject)=>{const req=db.transaction('projects').objectStore('projects').get('current');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});} finally {db.close();}
}
