// Max [serial] bytes -> [js coordinate_serial.js]. Four outlets: x y z id.
inlets=1;outlets=4;
var line='';
function msg_int(value){
    if(value===13)return;
    if(value!==10){if(line.length<4096)line+=String.fromCharCode(value);else line='';return;}
    try{
        var frame=JSON.parse(line);
        if(frame.mode==='hand')for(var i=0;i<frame.points.length;i++){
            var p=frame.points[i];
            if(p.id===8){outlet(3,p.id);outlet(2,p.z===undefined?0:p.z);outlet(1,p.y);outlet(0,p.x);}
        }
    }catch(error){post('Invalid coordinate JSON\n');}
    line='';
}
