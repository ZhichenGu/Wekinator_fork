// Run on the browser computer: node platform_osc_bridge.mjs
import {isIPv4} from 'node:net';
import http from 'node:http';
import dgram from 'node:dgram';

const host = '127.0.0.1';
const udp = dgram.createSocket('udp4');

function oscString(text) {
  const size = Buffer.byteLength(text);
  const padded = Buffer.alloc(4 * Math.ceil((size + 1) / 4));
  padded.write(text);
  return padded;
}

function packet(address,value,integer) {
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

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin ?? '';
  const local = /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(origin);
  if (req.headers.host !== host + ':8765' || !(local || ['https://ml-play.onrender.com','https://wekinator-fork.onrender.com'].includes(origin))) {
    res.writeHead(403).end();
    return;
  }
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  if (req.url !== '/osc' && req.url !== '/osc/int32') { res.writeHead(404).end(); return; }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Private-Network': 'true',
      'Access-Control-Max-Age': '600'
    }).end();
    return;
  }
  if (req.method !== 'POST' || req.headers['content-type'] !== 'application/json') {
    res.writeHead(400).end(); return;
  }
  try {
    let length = 0;
    const chunks = [];
    for await (const chunk of req) {
      length += chunk.length;
      if (length > 4096) { res.writeHead(413).end(); return; }
      chunks.push(chunk);
    }
    const {host:target,port,address,value}=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (typeof target!=='string' || !isIPv4(target)) throw Error('Invalid IP');
    const [a,b]=target.split('.').map(Number);
    const allowed=target===host || a===10 || a===192&&b===168 || a===172&&b>=16&&b<=31;
    if (!allowed || !Number.isInteger(port) || port<1 || port>65535 ||
        typeof address!=='string' || address.length>160 || !/^(\/[A-Za-z0-9_.-]+)+$/.test(address)) throw Error('Invalid destination');
    const message = packet(address,value,req.url==='/osc/int32');
    udp.send(message, port, target, error => res.writeHead(error ? 502 : 204).end());
  } catch { res.writeHead(400).end(); }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(8765, host, () => console.log('Platform OSC ready on http://127.0.0.1:8765 (Ctrl+C to stop)'));
