export type OscType = 'string'|'integer'|'float';
export type OscTrigger = {type:OscType; yes:string; no?:string};

export function oscValue(type:OscType, raw:string):string|number {
  if (typeof raw!=='string' || !raw.trim() || raw.length>512 || raw.includes('\0')) throw Error('Invalid OSC argument');
  if (type==='string') return raw;
  const value=Number(raw);
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw.trim()) || !Number.isFinite(Math.fround(value)) ||
      (type==='integer' && (!Number.isInteger(value) || value< -2147483648 || value>2147483647))) throw Error('Invalid OSC number');
  return value;
}

export function oscArgument(value:string|number,target?:OscTarget,positive=true) {
  if (typeof value==='number') return {type:'float' as const,value};
  const trigger=target?.trigger;
  const type=trigger?.type??'string';
  return {type,value:oscValue(type,(positive?trigger?.yes:trigger?.no)??value)};
}

export type OscTarget = {host:string; port:number; address:string; trigger?:OscTrigger};

export function defaultOscTarget(continuous:boolean):OscTarget {
  return {host:'127.0.0.1',port:9000,address:continuous?'/platform/value':'/platform/trigger'};
}

export function cleanOscTarget(raw:unknown):OscTarget {
  if (!raw || typeof raw!=='object') throw Error('OSC 目标无效。');
  const {host,port,address,trigger}=raw as OscTarget;
  const parts=typeof host==='string'?host.split('.'): [];
  const [a,b]=parts.map(Number);
  const local=a===10 || a===192&&b===168 || a===172&&b>=16&&b<=31 || host==='127.0.0.1';
  if (!local || parts.length!==4 || !parts.every(n=>/^(0|[1-9]\d{0,2})$/.test(n)&&Number(n)<=255) ||
      !Number.isInteger(port) || port<1 || port>65535 || typeof address!=='string' ||
      address.length>160 || !/^(\/[A-Za-z0-9_.-]+)+$/.test(address)) throw Error('OSC 目标无效。');
  if (trigger===undefined) return {host,port,address};
  if (!trigger || !['string','integer','float'].includes(trigger.type)) throw Error('Invalid OSC type');
  oscValue(trigger.type,trigger.yes);
  if (trigger.no!==undefined) oscValue(trigger.type,trigger.no);
  return {host,port,address,trigger:{type:trigger.type,yes:trigger.yes,no:trigger.no}};

}
