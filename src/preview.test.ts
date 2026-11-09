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

test('floating preview appears when one third leaves above, without flickering at the boundary',()=>{
 assert.equal(floatingPreviewVisible(.66,-200,false),true);
 assert.equal(floatingPreviewVisible(.68,-180,false),false);
 assert.equal(floatingPreviewVisible(.70,-180,true),true);
 assert.equal(floatingPreviewVisible(.75,-150,true),false);
 assert.equal(floatingPreviewVisible(.1,200,false),false);
});

test('effective camera visibility includes the sticky footer and fully scrolled-away frames',async()=>{
 const {visiblePreviewRatio}=await import('./preview');
 assert.equal(visiblePreviewRatio({top:-200,bottom:160,height:360},0,800),160/360);
 assert.equal(visiblePreviewRatio({top:-200,bottom:160,height:360},0,100),100/360);
 assert.equal(visiblePreviewRatio({top:-400,bottom:-40,height:360},0,800),0);
 assert.equal(visiblePreviewRatio({top:100,bottom:460,height:360},0,800),1);
});
