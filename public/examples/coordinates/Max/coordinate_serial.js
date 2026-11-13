// Max [serial] bytes -> [js coordinate_serial.js]. Four outlets: x y z id.
inlets=1;outlets=4;
var line='', overflow=false;
function finite(value){return typeof value==='number' && isFinite(value);}
function msg_int(value){
    if(value===13)return;
    if(value!==10){if(line.length<4096)line+=String.fromCharCode(value);else overflow=true;return;}
    if(overflow){line='';overflow=false;return;}
    try{
        var frame=JSON.parse(line);
        if(frame.mode==='hand' && frame.values){
            var keys=['index_tip_x','index_tip_y','index_tip_z'];
            var matched=false;
            for(var axis=0;axis<3;axis++)if(keys[axis] in frame.values){if(!finite(frame.values[keys[axis]]))throw Error('Invalid number');matched=true;}
            if(matched){for(var axis=0;axis<3;axis++)if(finite(frame.values[keys[axis]]))outlet(axis,frame.values[keys[axis]]);outlet(3,8);}
            line='';return;
        }
        if(frame.mode==='hand')for(var i=0;i<frame.points.length;i++){
            var p=frame.points[i];
            if(p.id===8 && finite(p.x) && finite(p.y) && (p.z===undefined||finite(p.z))){outlet(3,p.id);outlet(2,p.z===undefined?0:p.z);outlet(1,p.y);outlet(0,p.x);}
        }
    }catch(error){post('Invalid coordinate JSON\n');}
    line='';
}
