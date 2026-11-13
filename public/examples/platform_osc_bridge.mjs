// Run on the browser computer: node platform_osc_bridge.mjs
import {isIPv4} from 'node:net';
import http from 'node:http';
import dgram from 'node:dgram';
import {pathToFileURL} from 'node:url';

const host = '127.0.0.1';

function oscString(text) {
  const size = Buffer.byteLength(text);
  const padded = Buffer.alloc(4 * Math.ceil((size + 1) / 4));
  padded.write(text);
  return padded;
}

function packet(address,value,integer) {
  if(Array.isArray(value)&&value.length>=2&&value.length<=3&&value.every(n=>typeof n==='number'&&Number.isFinite(Math.fround(n)))) {
    const args=Buffer.alloc(value.length*4);value.forEach((n,i)=>args.writeFloatBE(n,i*4));
    return Buffer.concat([oscString(address),oscString(','+'f'.repeat(value.length)),args]);
  }
  if (integer) {
    if (!Number.isInteger(value) || value < -2147483648 || value > 2147483647) throw Error('Expected int32');
    const argument=Buffer.alloc(4);
    argument.writeInt32BE(value);
    return Buffer.concat([oscString(address),oscString(',i'),argument]);
  }
  if (typeof value === 'string' && value.length > 0 && value.length <= 512 && !value.includes('\0')) {
    return Buffer.concat([oscString(address), oscString(',s'), oscString(value)]);
  }
  if (typeof value === 'number' && Number.isFinite(Math.fround(value))) {
    const argument = Buffer.alloc(4);
    argument.writeFloatBE(value);
    return Buffer.concat([oscString(address), oscString(',f'), argument]);
  }
  throw Error('Expected one text or numeric argument');
}

export function createOscReceiver() {
  const udp = dgram.createSocket('udp4');
  async function handle(req, res, integer, coordinates=false) {
    if (req.method !== 'POST' || req.headers['content-type'] !== 'application/json') {
      res.writeHead(400).end(); return;
    }
    try {
      let length = 0;
      const chunks = [];
      for await (const chunk of req) {
        length += chunk.length;
        if (length > (coordinates?16384:4096)) { res.writeHead(413).end(); return; }
        chunks.push(chunk);
      }
      const {host:target,port,address,value,points}=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (typeof target!=='string' || !isIPv4(target)) throw Error('Invalid IP');
      const [a,b]=target.split('.').map(Number);
      const allowed=target===host || a===10 || a===192&&b===168 || a===172&&b>=16&&b<=31;
      if (!allowed || !Number.isInteger(port) || port<1 || port>65535 ||
          typeof address!=='string' || address.length>160 || !/^(\/[A-Za-z0-9_.-]+)+$/.test(address)) throw Error('Invalid destination');
      let messages;
      if(coordinates) {
        if(!Array.isArray(points)||points.length<1||points.length>42||new Set(points.map(p=>p.id)).size!==points.length)throw Error('Invalid coordinate batch');
        messages=points.map(p=>{
          if(!Number.isInteger(p.id)||p.id<0||p.id>477||!Array.isArray(p.values))throw Error('Invalid point');
          if(p.name!==undefined||p.axes!==undefined){
            if(typeof p.name!=='string'||!/^[A-Za-z][A-Za-z0-9_]{0,15}$/.test(p.name)||!Array.isArray(p.axes)||!p.axes.length||p.axes.length>3||new Set(p.axes).size!==p.axes.length||p.axes.some(a=>!['x','y','z'].includes(a))||p.values.length!==p.axes.length||p.values.some(v=>typeof v!=='number'||!Number.isFinite(Math.fround(v))))throw Error('Invalid named axes');
            return p.axes.map((axis,i)=>packet(address+'/'+p.name+'/'+axis,p.values[i],false));
          }
          return packet(address+'/'+p.id,p.values,false);
        }).flat();
      } else messages=[packet(address,value,integer)];
      await Promise.all(messages.map(message=>new Promise((resolve,reject)=>udp.send(message,port,target,e=>e?reject(e):resolve()))));
      res.writeHead(204).end();
    } catch { res.writeHead(400).end(); }
  }
  return {handle, close: () => udp.close()};
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const receiver = createOscReceiver();
  const server = http.createServer((req, res) => {
    const origin = req.headers.origin ?? '';
    const local = /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(origin);
    if (req.headers.host !== host + ':8765' || !(local || ['https://ml-play.onrender.com','https://wekinator-fork.onrender.com'].includes(origin))) {
      res.writeHead(403).end();
      return;
    }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    if (req.url !== '/osc' && req.url !== '/osc/int32' && req.url !== '/osc/coordinates' && req.url !== '/osc/axes') { res.writeHead(404).end(); return; }
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Private-Network': 'true',
        'Access-Control-Max-Age': '600'
      }).end();
      return;
    }
    void receiver.handle(req, res, req.url === '/osc/int32',req.url === '/osc/coordinates'||req.url === '/osc/axes');
  });
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(8765, host, () => console.log('Platform OSC ready on http://127.0.0.1:8765 (Ctrl+C to stop)'));
}
