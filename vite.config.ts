import {defineConfig} from 'vite';
import {createAccessGate} from './server/access.mjs';
export default defineConfig({
  plugins:[{name:'password-access',configureServer(server){const gate=createAccessGate();server.middlewares.use(gate);server.httpServer?.prependListener('upgrade',(req,socket)=>{if(!gate.isAuthorized(req)){socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');socket.destroy();}});},configurePreviewServer(server){server.middlewares.use(createAccessGate());}}],
});
