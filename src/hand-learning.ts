import {extract,type Action,type Frame,type Point,type Project} from './core';
import {focusedFrame,recommendedPoints} from './focus';
export type HandInputKey='any'|'left'|'right'|'dual';
export type HandInputs=Record<HandInputKey,Frame|null>;
export const actionHandKey=(project:Project,action?:Action):HandInputKey=>(action?.handCount??(project.handTracking==='dual'?2:1))===2?'dual':action?.hand??'any';
export const actionHandLabel=(project:Project,action:Action)=>actionHandKey(project,action)==='dual'?'双手动作':action.hand==='left'?'左手动作':action.hand==='right'?'右手动作':'单手动作';
export function dualHandFrame(points:Point[],t:number,focus?:number[]):Frame|null{
 if(points.length!==42)return null;
 const left=focusedFrame('hand',points.slice(0,21),focus??recommendedPoints('hand'),t);
 const right=focusedFrame('hand',points.slice(21),focus??recommendedPoints('hand'),t);
 if(!left||!right)return null;
 const scale=(left.scale+right.scale)/2,root:[number,number]=[(points[0].x+points[21].x)/2,(points[0].y+points[21].y)/2];
 const ids=focus??recommendedPoints('hand');
 const shape=[0,21].flatMap(offset=>ids.flatMap(id=>[(points[id+offset].x-root[0])/scale,(points[id+offset].y-root[1])/scale]));
 return {t,points,shape,root,scale,handCount:2,handRoots:[points[0].x,points[0].y,points[21].x,points[21].y]};
}
/** Receives anatomical left/right slots from CoordinateHands, independent of array order. */
export class HandLearningInput{
 private active:'left'|'right'|undefined;
 private last=-Infinity;
 reset(){this.active=undefined;this.last=-Infinity;}
 step(points:Point[],t:number,focus?:number[]):HandInputs{
   if(t<this.last||t-this.last>350)this.active=undefined;this.last=t;
   const one=(side:'left'|'right')=>{
     const selected=points.slice(side==='left'?0:21,side==='left'?21:42);
     const frame=focus?focusedFrame('hand',selected,focus,t):extract('hand',selected,[],t);
     return frame?{...frame,handCount:1 as const,handSide:side}:null;
   };
   const left=one('left'),right=one('right');
   if(!this.active||!(this.active==='left'?left:right))this.active=left?'left':right?'right':undefined;
   return {left,right,any:this.active==='left'?left:this.active==='right'?right:null,dual:dualHandFrame(points,t,focus)};
 }
}
export function storedHandInputs(frame:Frame|null):HandInputs{
 const inputs:HandInputs={any:null,left:null,right:null,dual:null};
 if(frame?.handCount===2)inputs.dual=frame;
 else if(frame){inputs.any=frame;if(frame.handSide)inputs[frame.handSide]=frame;}
 return inputs;
}

// Experimental joint-learning projects remain exportable, without enabling execution.
export const deferredHandLearning=(p:Project)=>p.mode==='hand'&&p.learning!=='coordinates'&&(p.handTracking==='dual'||p.handTracking==='mixed'||p.actions.some(a=>a.handCount===2));
