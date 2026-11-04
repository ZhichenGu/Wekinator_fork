import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeMessage, SerialConnection, type DevicePort } from './serial';

class FakePort extends EventTarget implements DevicePort {
  bytes: number[][]=[]; opened=false; closed=false;
  writable: WritableStream<Uint8Array>|null = new WritableStream({write:(bytes:Uint8Array)=>{this.bytes.push(Array.from(bytes));}});
  getInfo(){return {usbVendorId:0x2341,usbProductId:1};}
  async open(){this.opened=true;}
  async close(){assert.equal(this.writable?.locked,false);this.closed=true;}
}
test('serial messages preserve slashes, zero, Unicode and explicit endings',()=>{
  const decode=(text:string,lineEnding:'none'|'lf'|'crlf')=>new TextDecoder().decode(encodeMessage({text,lineEnding}));
  assert.equal(decode('/success','lf'),'/success\n');
  assert.equal(decode('0','none'),'0');
  assert.equal(decode('YES','crlf'),'YES\r\n');
  assert.equal(decode('成功','lf'),'成功\n');
  assert.equal(decode('literal\\n','none'),'literal\\n');
  assert.throws(()=>encodeMessage({text:'',lineEnding:'none'}));
});
test('connection sends exactly once, releases writer and closes cleanly',async()=>{
  const port=new FakePort(),connection=new SerialConnection();
  await connection.connect(port,9600);
  await connection.send({text:'1',lineEnding:'lf'});
  assert.deepEqual(port.bytes,[[49,10]]);
  assert.equal(port.writable?.locked,false);
  await connection.disconnect();assert.equal(port.closed,true);
  await assert.rejects(connection.send({text:'1',lineEnding:'none'}),/未连接/);
  assert.equal(port.bytes.length,1);
});
test('overlapping transmissions are rejected instead of queued or replayed',async()=>{
  let finish:()=>void=()=>{};
  const port=new FakePort();port.writable=new WritableStream({write:()=>new Promise<void>(r=>finish=r)});
  const connection=new SerialConnection();await connection.connect(port,115200);
  const first=connection.send({text:'A',lineEnding:'none'});
  await Promise.resolve();
  await assert.rejects(connection.send({text:'B',lineEnding:'none'}),/仍在发送/);
  finish();await first;await connection.disconnect();
});
test('failed writes release the lock and are not silently retried',async()=>{
  let writes=0;const port=new FakePort();port.writable=new WritableStream({write:()=>{writes++;throw new Error('device lost');}});
  const connection=new SerialConnection();await connection.connect(port,9600);
  await assert.rejects(connection.send({text:'A',lineEnding:'lf'}),/device lost/);
  assert.equal(port.writable.locked,false);assert.equal(writes,1);await connection.disconnect();
});

test('disconnect during opening cancels the connection and closes the newly opened port',async()=>{
  let finish:()=>void=()=>{};const port=new FakePort();port.open=()=>new Promise<void>(resolve=>finish=resolve);
  const connection=new SerialConnection();const opening=connection.connect(port,9600);
  await connection.disconnect();finish();
  await assert.rejects(opening,/取消/);assert.equal(connection.port,null);assert.equal(port.closed,true);
});
