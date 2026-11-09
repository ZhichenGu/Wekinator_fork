import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MqttConnection, validateBroker, validateMqttMessage, type MqttPeer } from './mqtt-output';
const config={url:'ws://127.0.0.1:18884/mqtt',username:'',clientId:'test',passwordRequired:false};
class FakePeer implements MqttPeer {
  connected=false;packets:{topic:string;payload:string;options:unknown}[]=[];
  listeners=new Map<string,((...args:any[])=>void)[]>();
  on(event:string,fn:(...args:any[])=>void){this.listeners.set(event,[...(this.listeners.get(event)??[]),fn]);return this;}
  emit(event:string,...args:any[]){this.listeners.get(event)?.forEach(fn=>fn(...args));}
  connect(){this.connected=true;this.emit('connect');}
  end(){this.connected=false;this.emit('close');}
  publish(topic:string,payload:string,options:unknown,callback:(error?:Error)=>void){this.packets.push({topic,payload,options});callback();}
}
test('browser MQTT accepts WebSocket endpoints, strips extra credentials and rejects TCP or mixed content',()=>{
  assert.equal(validateBroker({...config,url:'wss://example.com:443/mqtt'},true).url,'wss://example.com:443/mqtt');
  assert.throws(()=>validateBroker({...config,url:'mqtt://example.com:1883'}),/WebSocket|ws:\/\//);
  assert.throws(()=>validateBroker(config,true),/wss/);
  assert.throws(()=>validateBroker({...config,url:'ws://user:secret@example.com/mqtt'}),/凭证/);
  assert.equal('password' in validateBroker({...config,password:'not-to-export'} as any),false);
});
test('publish topics support slash paths but not wildcards; zero payload is preserved',()=>{
  assert.doesNotThrow(()=>validateMqttMessage({topic:'/project/action',payload:'0',qos:1}));
  assert.throws(()=>validateMqttMessage({topic:'project/#',payload:'YES',qos:0}));
});
test('MQTT sends one non-retained message, never queues while disconnected',async()=>{
  const peer=new FakePeer();const connection=new MqttConnection(async()=>peer);
  await connection.connect(config,'',()=>{});
  await connection.send({topic:'project/action',payload:'0',qos:1});
  assert.deepEqual(peer.packets,[{topic:'project/action',payload:'0',options:{qos:1,retain:false}}]);
  connection.disconnect();await assert.rejects(connection.send({topic:'project/action',payload:'YES',qos:0}),/未连接/);
  assert.equal(peer.packets.length,1);
});
test('canceling lazy client initialization never connects the client',async()=>{
  let ready:(p:MqttPeer)=>void=()=>{};const peer=new FakePeer();
  const connection=new MqttConnection(()=>new Promise(resolve=>ready=resolve));
  const attempt=connection.connect(config,'',()=>{});connection.disconnect();ready(peer);
  await assert.rejects(attempt,/取消/);assert.equal(peer.connected,false);
});

test('a late connect event cannot revive a rejected MQTT connection',async()=>{
 const peer=new FakePeer();peer.connect=()=>{peer.emit('error',new Error('denied'));};
 const connection=new MqttConnection(async()=>peer);const states:string[]=[];
 await assert.rejects(connection.connect(config,'',state=>states.push(state)),/denied/);
 peer.connected=true;peer.emit('connect');assert.equal(connection.connected,false);assert.ok(!states.includes('connected'));
 await assert.rejects(connection.send({topic:'project/action',payload:'YES',qos:1}),/未连接/);
});
