import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../package.json',import.meta.url));
const {WebSocketServer}=require('ws');const packet=require('mqtt-packet');
const records=[];
const server=http.createServer((req,res)=>{res.setHeader('content-type','application/json');res.end(JSON.stringify(req.url==='/records'?records:{testBroker:true}));});
const sockets=new WebSocketServer({server,path:'/mqtt'});
sockets.on('connection',socket=>{
 const parser=packet.parser();socket.on('message',data=>parser.parse(Buffer.from(data)));
 parser.on('error',()=>socket.close());
 parser.on('packet',p=>{
  if(p.cmd==='connect')socket.send(packet.generate({cmd:'connack',returnCode:0,sessionPresent:false}));
  if(p.cmd==='pingreq')socket.send(packet.generate({cmd:'pingresp'}));
  if(p.cmd==='publish'){
   const record={topic:p.topic,payload:p.payload.toString(),qos:p.qos,retain:p.retain};records.push(record);process.stdout.write(JSON.stringify(record)+'\n');
   if(p.qos===1)socket.send(packet.generate({cmd:'puback',messageId:p.messageId}));
  }
 });
});
server.listen(18884,'127.0.0.1',()=>process.stdout.write('Local MQTT WebSocket test fixture: ws://127.0.0.1:18884/mqtt\n'));
process.on('SIGINT',()=>{sockets.clients.forEach(s=>s.terminate());sockets.close();server.close(()=>process.exit(0));});
