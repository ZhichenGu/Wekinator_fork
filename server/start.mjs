import {createAudioApi} from './audio-api.mjs';
import http from 'node:http';
import {createObjectApi} from './object-api.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createAccessGate} from './access.mjs';
const dist=fileURLToPath(new URL('../dist/',import.meta.url));
const gate=createAccessGate();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png','.mp4':'video/mp4','.jpg':'image/jpeg'};
const api=createObjectApi(),audioApi=createAudioApi();
const server=http.createServer((req,res)=>void gate(req,res,()=>void api(req,res,()=>void audioApi(req,res,()=>void serve(req,res)))).catch(()=>{if(!res.headersSent)res.writeHead(500);res.end('服务器错误。');}));
async function serve(req,res){
  if(!['GET','HEAD'].includes(req.method??'')){res.writeHead(405);res.end();return;}
  try{
    const url=new URL(req.url,'http://localhost');const pathname=decodeURIComponent(url.pathname);
    let file=path.resolve(dist,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(dist)){res.writeHead(403);res.end();return;}
    let info;try{info=await stat(file);}catch{if(req.headers.accept?.includes('text/html')){file=path.join(dist,'index.html');info=await stat(file);}else throw new Error('not found');}
    if(!info.isFile())throw new Error('not found');
    res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Content-Length':info.size,'Cache-Control':'private, no-cache','X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD')res.end();else createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  }catch{if(!res.headersSent)res.writeHead(404);res.end('文件不存在。');}
}
const port=Number(process.env.PORT??5173),host=process.env.HOST??'127.0.0.1';
server.listen(port,host,()=>console.log(`Password-protected app: http://${host}:${port}`));
