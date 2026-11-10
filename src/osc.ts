export type OscTarget = {host:string; port:number; address:string};

export function defaultOscTarget(continuous:boolean):OscTarget {
  return {host:'127.0.0.1',port:9000,address:continuous?'/platform/value':'/platform/trigger'};
}

export function cleanOscTarget(raw:unknown):OscTarget {
  if (!raw || typeof raw!=='object') throw Error('OSC 目标无效。');
  const {host,port,address}=raw as OscTarget;
  const parts=typeof host==='string'?host.split('.'): [];
  const [a,b]=parts.map(Number);
  const local=a===10 || a===192&&b===168 || a===172&&b>=16&&b<=31 || host==='127.0.0.1';
  if (!local || parts.length!==4 || !parts.every(n=>/^(0|[1-9]\d{0,2})$/.test(n)&&Number(n)<=255) ||
      !Number.isInteger(port) || port<1 || port>65535 || typeof address!=='string' ||
      address.length>160 || !/^(\/[A-Za-z0-9_.-]+)+$/.test(address)) throw Error('OSC 目标无效。');
  return {host,port,address};
}
