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
    const previous=client;client=null;if(previous)previous.end(true);
    statusText='Connecting';last=-10000;
    const subscribedTopic=topic.value().trim();
    let connection;
    try{connection=mqtt.connect(address.value().trim(),{username:username.value(),password:password.value(),reconnectPeriod:0});}
    catch{statusText='Connection error';return;}
    client=connection;
    connection.on('connect',()=>{
      if(client!==connection)return;
      statusText='Subscribing';
      connection.subscribe(subscribedTopic,(error,granted)=>{
        if(client!==connection)return;
        statusText=error||!granted?.length||granted.some(g=>g.qos===128)?'Subscription failed':'Subscribed';
      });
    });
    connection.on('error',()=>{if(client===connection)statusText='Connection error';});
    connection.on('close',()=>{if(client===connection){if(statusText!=='Connection error'&&statusText!=='Subscription failed')statusText='Disconnected';last=-10000;}});
    connection.on('message',(name,bytes,packet)=>{
      if(client===connection&&name===subscribedTopic&&!packet?.retain)receive(bytes.toString());
    });
  });
}
function receive(line){
  try{
    const frame=JSON.parse(line);
    if(frame.mode!=='hand')return;
    if(frame.values){
      const values=frame.values;
      const keys=['index_tip_x','index_tip_y','index_tip_z'];
      const present=keys.filter(key=>Object.prototype.hasOwnProperty.call(values,key));
      if(!present.length)return;
      if(present.some(key=>!Number.isFinite(values[key])))throw Error('Invalid coordinate number');
      if('index_tip_x' in values)x=values.index_tip_x;
      if('index_tip_y' in values)y=values.index_tip_y;
      if('index_tip_z' in values)z=values.index_tip_z;
      last=millis();
      return;
    }
    if(!Array.isArray(frame.points))return;
    const point=frame.points.find(p=>p.id===8);
    if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.z!==undefined&&!Number.isFinite(point.z))return;
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
