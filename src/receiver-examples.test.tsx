import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {newAudioProject} from './audio';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {SerialPanel,type SerialOutput} from './SerialPanel';

const source=(name:string)=>readFileSync(new URL('../public/examples/coordinates/'+name,import.meta.url),'utf8');
test('Serial download follows trigger, numeric or coordinate format',()=>{
  const output:SerialOutput={supported:false,ports:[],selected:null,setSelected:()=>{},status:'idle',feedback:'',error:'',refresh:async()=>{},choose:async()=>{},connect:async()=>{},disconnect:async()=>{},send:async()=>{}};
  for(const [flags,file] of [[{},'serial_success_led.ino'],[{continuous:true},'serial_numeric_receiver.ino'],[{coordinates:true},'coordinate_receivers.zip']] as const){
    const html=renderToStaticMarkup(<SerialPanel {...flags} output={output} baudRate={115200} disabled={false} onMessage={()=>{}} onBaudRate={()=>{}} onTest={()=>{}}/>);
    assert.ok(html.includes('href="/examples/'+file+'"'));
    if('continuous' in flags)assert.ok(html.includes('value="{value}"'));
  }
});
test('Max Serial ignores unrelated names, invalid numbers and whole overlong lines',()=>{
  const sent:unknown[]=[];
  const context=vm.createContext({outlet:(...args:unknown[])=>sent.push(args),post:()=>{}});
  vm.runInContext(source('Max/coordinate_serial.js'),context);
  const feed=(line:string)=>{for(const c of line+'\n')context.msg_int(c.charCodeAt(0));};
  feed('{"mode":"hand","values":{"wrist_x":0.2}}');assert.deepEqual(sent,[]);
  feed('{"mode":"hand","values":{"index_tip_x":0.2,"index_tip_y":0.7}}');assert.deepEqual(sent,[[0,.2],[1,.7],[3,8]]);
  sent.length=0;feed('{"mode":"hand","values":{"index_tip_x":1e999}}');assert.deepEqual(sent,[]);
  feed(' '.repeat(8193)+'{"mode":"hand","values":{"index_tip_x":0.9}}');assert.deepEqual(sent,[]);
  feed('{"mode":"hand","points":[{"id":8,"x":0.4,"y":0.6}]}');assert.deepEqual(sent,[[3,8],[2,0],[1,.6],[0,.4]]);
});
test('p5 receiver only refreshes recognized finite coordinates, including legacy JSON',()=>{
  let now=100;
  const context=vm.createContext({millis:()=>now});vm.runInContext(source('p5js/sketch.js'),context);
  const receive=(value:string)=>context.receive(value);
  const state=()=>vm.runInContext('JSON.stringify({x,y,z,last,statusText})',context);
  receive('{"mode":"hand","values":{"index_tip_x":0.3}}');assert.equal(JSON.parse(state()).last,100);
  now=900;receive('{"mode":"hand","values":{"wrist_x":0.9}}');assert.equal(JSON.parse(state()).last,100);
  receive('{"mode":"face","values":{"index_tip_x":0.9}}');assert.equal(JSON.parse(state()).last,100);
  receive('{"mode":"hand","values":{"index_tip_x":0.8,"index_tip_y":1e999}}');assert.equal(JSON.parse(state()).x,.3);assert.equal(JSON.parse(state()).last,100);
  receive('{"mode":"hand","points":[{"id":8,"x":0.6,"y":0.4}]}');assert.equal(JSON.parse(state()).last,900);
});
test('p5 waits for subscription acknowledgement and ignores late callbacks from a replaced client',()=>{
  let connectClick:()=>void=()=>{};
  const clients:Array<{handlers:Record<string,Function>;ack?:Function;end:Function;on:Function;subscribe:Function}>=[];
  const context=vm.createContext({millis:()=>100,createCanvas:()=>{},createP:()=>{},createInput:(value:string)=>({value:()=>value,attribute:()=>{}}),createButton:()=>({mousePressed:(fn:()=>void)=>{connectClick=fn;}}),mqtt:{connect:()=>{
    const client={handlers:{} as Record<string,Function>,end:()=>{},on(name:string,fn:Function){this.handlers[name]=fn;},subscribe(_topic:string,fn:Function){this.ack=fn;},ack:undefined as Function|undefined};clients.push(client);return client;
  }}});
  vm.runInContext(source('p5js/sketch.js'),context);context.setup();connectClick();const first=clients[0];
  first.handlers.connect();assert.equal(vm.runInContext('statusText',context),'Subscribing');
  first.ack!(null,[{qos:0}]);assert.equal(vm.runInContext('statusText',context),'Subscribed');
  connectClick();const second=clients[1];first.handlers.close();assert.equal(vm.runInContext('statusText',context),'Connecting');
  second.handlers.connect();second.ack!(null,[{qos:128}]);second.handlers.close();assert.equal(vm.runInContext('statusText',context),'Subscription failed');
});

test('new volume projects default to numeric templates while keyword projects retain YES',()=>{const volume=newAudioProject('level','volume');assert.equal(volume.yes,'{value}');assert.equal(volume.mqtt.payload,'{value}');assert.equal(newAudioProject('speech','keyword').yes,'YES');});
