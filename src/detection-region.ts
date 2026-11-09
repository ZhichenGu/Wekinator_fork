export type DetectionRegion={x:number;y:number;width:number;height:number};
export function validDetectionRegion(r:DetectionRegion){return !!r&&[r.x,r.y,r.width,r.height].every(Number.isFinite)&&r.x>=0&&r.y>=0&&r.width>=.02&&r.height>=.02&&r.x+r.width<=1.000001&&r.y+r.height<=1.000001;}
export function regionFromDrag(a:[number,number],b:[number,number]):DetectionRegion|null{
 const clamp=(n:number)=>Math.max(0,Math.min(1,n));const x=clamp(Math.min(a[0],b[0])),y=clamp(Math.min(a[1],b[1]));
 const region={x,y,width:clamp(Math.max(a[0],b[0]))-x,height:clamp(Math.max(a[1],b[1]))-y};return validDetectionRegion(region)?region:null;
}
/** Source pixel bounds, independent of letterboxing and browser size. */
export function sourceCrop(width:number,height:number,r?:DetectionRegion){
 if(r&&!validDetectionRegion(r))throw new Error('检测区域无效。');
 const x=r?Math.floor(r.x*width):0,y=r?Math.floor(r.y*height):0;
 return {x,y,width:Math.max(1,Math.min(width-x,r?Math.round(r.width*width):width)),height:Math.max(1,Math.min(height-y,r?Math.round(r.height*height):height))};
}
export function captureDetectionImage(source:CanvasImageSource,width:number,height:number,region?:DetectionRegion){
 const crop=sourceCrop(width,height,region),ratio=Math.min(1,640/Math.max(crop.width,crop.height)),canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(crop.width*ratio));canvas.height=Math.max(1,Math.round(crop.height*ratio));
 canvas.getContext('2d')!.drawImage(source,crop.x,crop.y,crop.width,crop.height,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.75);
}
