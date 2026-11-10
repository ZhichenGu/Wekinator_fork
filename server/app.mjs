import {createAudioApi} from './audio-api.mjs';
import http from 'node:http';
import {createObjectApi} from './object-api.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
const dist=fileURLToPath(new URL('../dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png','.mp4':'video/mp4','.jpg':'image/jpeg'};
export function createPlatformServer(authorize, desktopRoute) {
  const objects = createObjectApi();
  const audio = createAudioApi();
  return http.createServer(async (req, res) => {
    try {
      await authorize(req, res, async () => {
        if (desktopRoute && await desktopRoute(req, res)) return;
        await objects(req, res, () => audio(req, res, () => serve(req, res)));
      });
    } catch {
      if (!res.headersSent) res.writeHead(500);
      res.end('服务器错误。');
    }
  });
}
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
