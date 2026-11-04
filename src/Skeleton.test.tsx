import React from 'react';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {Skeleton} from './Skeleton';
import {extract} from './core';
test('partial body remains visible without becoming a valid training frame',()=>{
 const points=Array.from({length:33},(_,i)=>({x:.2+i*.01,y:.2+i*.01,visibility:i<23?1:0}));
 assert.equal(extract('pose',points),null);
 const svg=renderToStaticMarkup(<Skeleton points={points} mode="pose"/>);
 assert.ok(svg.includes('<line'));assert.ok(svg.includes('<circle'));
 assert.equal((svg.match(/<circle/g)??[]).length,23);
});
test('invisible intermediate joints never create a skeleton bridge',()=>{
 const points=Array.from({length:33},()=>({x:.2,y:.3,visibility:0}));
 points[11].visibility=1;points[15].visibility=1;
 const svg=renderToStaticMarkup(<Skeleton points={points} mode="pose"/>);
 assert.ok(!svg.includes('<line'));assert.equal((svg.match(/<circle/g)??[]).length,2);
});
