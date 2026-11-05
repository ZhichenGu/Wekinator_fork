export function withProjectId<T extends object>(project:T&{id?:string}):T&{id:string}{return {...project,id:project.id??crypto.randomUUID()};}
export function upsertProject<T extends {id?:string}>(items:T[],value:T):T[]{if(!value.id)throw new Error('项目缺少标识。');return [value,...items.filter(p=>p.id!==value.id)];}
export function projectName(name:string){const value=name.trim();if(!value||value.length>80)throw new Error('项目名称需为 1–80 个字符。');return value;}
