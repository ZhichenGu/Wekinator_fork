import { test } from 'node:test';
import assert from 'node:assert/strict';
import { containBox,floatingPreviewVisible } from './preview';
test('wide preview keeps a 4:3 camera unscaled in aspect ratio with side bars',()=>{
  assert.deepEqual(containBox(800,360,640,480),{left:160,top:0,width:480,height:360});
});
test('a 16:9 camera fits without stretching and narrow layouts use top/bottom bars',()=>{
  const wide=containBox(800,360,1920,1080);assert.equal(wide.width/wide.height,16/9);assert.equal(wide.height,360);
  const narrow=containBox(320,360,1920,1080);assert.deepEqual(narrow,{left:0,top:90,width:320,height:180});
});

test('floating preview appears when most of the camera leaves above, without flickering at the boundary',()=>{
 assert.equal(floatingPreviewVisible(.34,-200,false),true);
 assert.equal(floatingPreviewVisible(.4,-180,false),false);
 assert.equal(floatingPreviewVisible(.4,-180,true),true);
 assert.equal(floatingPreviewVisible(.5,-150,true),false);
 assert.equal(floatingPreviewVisible(.1,200,false),false);
});
