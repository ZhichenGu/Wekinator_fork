class Capture extends AudioWorkletProcessor {
 constructor(){super();this.parts=[];this.size=0;}
 process(inputs){const data=inputs[0]?.[0];if(data){this.parts.push(new Float32Array(data));this.size+=data.length;if(this.size>=2048){const joined=new Float32Array(this.size);let at=0;for(const p of this.parts){joined.set(p,at);at+=p.length;}this.port.postMessage(joined,[joined.buffer]);this.parts=[];this.size=0;}}return true;}
}
registerProcessor('platform-audio-capture',Capture);
