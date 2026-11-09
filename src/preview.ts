export function containBox(width:number,height:number,sourceWidth:number,sourceHeight:number) {
  if(width<=0||height<=0||sourceWidth<=0||sourceHeight<=0)return {left:0,top:0,width:0,height:0};
  const scale=Math.min(width/sourceWidth,height/sourceHeight);
  const w=sourceWidth*scale,h=sourceHeight*scale;
  return {left:(width-w)/2,top:(height-h)/2,width:w,height:h};
}

// Show after most of the main frame is above the viewport; hide once half returns.
export function floatingPreviewVisible(ratio:number,top:number,previous:boolean){
  return top<0&&ratio<(previous?.5:.35);
}
