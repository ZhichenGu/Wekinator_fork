import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {PointPicker} from './PointPicker';
import {containBox} from './preview';
import {DEFAULT_REGION,regionPoint} from './region';
import {selectRelationPoint,relationValue,relationFrame,relationDistance,DEFAULT_RELATION} from './relation';
import {RegionControls} from './RegionControls';

test('clicking mirrored image selects the same landmark after letterboxing and resize',()=>{
 const points=Array.from({length:21},(_,i)=>({x:.05+i*.04,y:.3}));
 for(const width of [640,1200]){const box=containBox(width,360,640,480);let picked=-1;
 const element=PointPicker({points,mode:'hand',selected:[8],onSelect:id=>{picked=id;}});
 const point=regionPoint('hand',points,{...DEFAULT_REGION,point:8})!;
 element.props.onPointerDown({currentTarget:{getBoundingClientRect:()=>({...box,left:box.left+100,top:box.top+50})},clientX:100+box.left+point[0]*box.width,clientY:50+box.top+point[1]*box.height});assert.equal(picked,8);
 element.props.onPointerDown({currentTarget:{getBoundingClientRect:()=>({...box,left:box.left+100,top:box.top+50})},clientX:0,clientY:0});assert.equal(picked,8);
 }
});
test('selection keeps two distinct slots; selected pair changes actual relation result',()=>{
 assert.deepEqual(selectRelationPoint([4,8],0,8),[8,4]);assert.deepEqual(selectRelationPoint([4,8],1,12),[4,12]);
 const points=Array.from({length:21},()=>({x:.5,y:.5}));points[9].y=.7;points[8].x=.51;points[12].x=.9;
 const f=relationFrame('hand',points)!;
 assert.equal(relationValue('hand',f,{...DEFAULT_RELATION,points:[4,8]}),true);
 assert.equal(relationValue('hand',f,{...DEFAULT_RELATION,points:[4,12]}),false);
 assert.ok(Math.abs(relationDistance(f,'hand',{...DEFAULT_RELATION,points:[4,12]})!-2)<1e-8);
 points[4].y=.2;assert.equal(relationValue('hand',f,{...DEFAULT_RELATION,rule:'above',points:[4,12]}),true);
});
test('selected marker is red, keyboard accessible, and region controls have five decimal sliders',()=>{
 const points=Array.from({length:21},()=>({x:.4,y:.35}));
 const svg=renderToStaticMarkup(<PointPicker points={points} mode="hand" selected={[8]} onSelect={()=>{}}/>);
 assert.equal((svg.match(/fill="#dc3545"/g)??[]).length,1);assert.equal((svg.match(/role="button"/g)??[]).length,21);
 const controls=renderToStaticMarkup(<RegionControls mode="hand" value={DEFAULT_REGION} onChange={()=>{}} disabled={false}/>);
 assert.equal((controls.match(/type="range"/g)??[]).length,5);assert.ok(controls.includes('step=".01"'));
});
