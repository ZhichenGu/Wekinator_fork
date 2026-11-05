import {defineConfig} from 'vite';
import {createObjectApi} from './server/object-api.mjs';
import {createAccessGate} from './server/access.mjs';
export default defineConfig({
  plugins:[{name:'password-access',configureServer(server){const gate=createAccessGate();server.middlewares.use(gate);server.middlewares.use(createObjectApi());server.httpServer?.prependListener('upgrade',(req,socket)=>{if(!gate.isAuthorized(req)){socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');socket.destroy();}});},configurePreviewServer(server){server.middlewares.use(createAccessGate());server.middlewares.use(createObjectApi());}}],
});
