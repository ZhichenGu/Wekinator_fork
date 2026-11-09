export function containBox(width:number,height:number,sourceWidth:number,sourceHeight:number) {
  if(width<=0||height<=0||sourceWidth<=0||sourceHeight<=0)return {left:0,top:0,width:0,height:0};
  const scale=Math.min(width/sourceWidth,height/sourceHeight);
  const w=sourceWidth*scale,h=sourceHeight*scale;
  return {left:(width-w)/2,top:(height-h)/2,width:w,height:h};
}

// Show once about one third leaves above; hide when three quarters returns.
export function floatingPreviewVisible(ratio:number,top:number,previous:boolean){
  return top<0&&ratio<(previous?.75:2/3);
}

export function visiblePreviewRatio(rect:{top:number;bottom:number;height:number},visibleTop:number,visibleBottom:number){
 if(rect.height<=0||visibleBottom<=visibleTop)return 0;
 return Math.max(0,Math.min(rect.bottom,visibleBottom)-Math.max(rect.top,visibleTop))/rect.height;
}
