// p5 Web Editor: copy this sketch, add the MQTT.js library script from index.html.
// MQTT receives directly through WSS. Credentials remain in input fields in memory.
let x=.5, y=.5, z=0, last=-10000, client, statusText='Not connected';
let address, username, password, topic;
function setup(){
  createCanvas(720,480);
  createP('MQTT Broker WSS URL, username, password and topic');
  address=createInput('wss://YOUR_HOST:8084/mqtt');
  username=createInput('');password=createInput('','password');
  topic=createInput('platform/coordinates');
  address.attribute('aria-label','Broker WSS URL');username.attribute('aria-label','MQTT username');password.attribute('aria-label','MQTT password');topic.attribute('aria-label','MQTT topic');
  createButton('Connect MQTT').mousePressed(()=>{
    if(client)client.end(true);
    statusText='Connecting';
    client=mqtt.connect(address.value(),{username:username.value(),password:password.value(),reconnectPeriod:0});
    client.on('connect',()=>{client.subscribe(topic.value());statusText='Subscribed';});
    client.on('error',()=>{statusText='Connection error';});
    client.on('close',()=>{statusText='Disconnected';last=-10000;});
    client.on('message',(name,bytes)=>receive(bytes.toString()));
  });
}
function receive(line){
  try{
    const frame=JSON.parse(line);
    if(frame.mode!=='hand'||!Array.isArray(frame.points))return;
    const point=frame.points.find(p=>p.id===8);
    if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return;
    x=point.x;y=point.y;z=point.z??0;last=millis();
  }catch{statusText='Invalid coordinate message';}
}
function draw(){
  background(245);fill(40);text(statusText,20,30);
  if(millis()-last<800){
    fill(100,160,220);circle(x*width,y*height,36);
    fill(40);text('x='+x+' y='+y+' z='+z,20,55);
  }else text('Waiting for coordinates',20,55);
}
