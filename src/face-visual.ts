/** Contour groups use detector landmark IDs; they never change model inputs. */
export const FACE_CONTOURS=[
 {name:'mouth',ids:[61,291,13,14],paths:[[61,146,91,181,84,17,314,405,321,375,291,409,270,269,267,0,37,39,40,185,61],[78,95,88,178,87,14,317,402,318,324,308,415,310,311,312,13,82,81,80,191,78]]},
 {name:'right-eye',ids:[33,133,145,159],paths:[[33,246,161,160,159,158,157,173,133,155,154,153,145,144,163,7,33]]},
 {name:'left-eye',ids:[263,362,374,386],paths:[[263,466,388,387,386,385,384,398,362,382,381,380,374,373,390,249,263]]},
 {name:'right-brow',ids:[46,52,53,55,65,70,105,107],paths:[[70,63,105,66,107],[46,53,52,65,55]]},
 {name:'left-brow',ids:[276,282,283,285,295,300,334,336],paths:[[300,293,334,296,336],[276,283,282,295,285]]},
 {name:'oval',ids:[],paths:[[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109,10]]}
] as const;
export function facePointStyle(selected:boolean,count:number,dense:boolean){
 const all=count>100;
 return {radius:all?1.5:selected?4:1.5,opacity:all?.24:selected?.95:.035,fill:all?'#e5edf5':selected?'#dc3545':'#e5edf5',stroke:!all&&selected?'#fff':'none',strokeWidth:!all&&selected?.7:0};
}
export function faceContourOpacity(group:typeof FACE_CONTOURS[number],focus?:number[]){
 if(!focus||focus.length>100)return group.name==='oval'?.10:.25;
 return group.ids.some(id=>focus.includes(id))?.68:.035;
}
