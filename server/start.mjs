import {createPlatformServer} from './app.mjs';
import {createAccessGate} from './access.mjs';

const server = createPlatformServer(createAccessGate());
const port=Number(process.env.PORT??5173),host=process.env.HOST??'127.0.0.1';
server.listen(port,host,()=>console.log(`Password-protected app: http://${host}:${port}`));
