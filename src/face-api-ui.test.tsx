import React from 'react';import test from 'node:test';import assert from 'node:assert/strict';import {renderToStaticMarkup} from 'react-dom/server';
import {ApiConfigHeader} from './ApiConfigHeader';import {Skeleton} from './Skeleton';import {PointPicker} from './PointPicker';import {facePointStyle,FACE_CONTOURS,faceContourOpacity} from './face-visual';import {setLanguage} from './i18n';
test('API fold is a single full-width accessible button with provider and actual status',()=>{
 for(const expanded of [false,true]){const html=renderToStaticMarkup(<ApiConfigHeader expanded={expanded} controls="api-controls" onToggle={()=>{}} provider="OpenAI" status="已验证"/>);assert.equal((html.match(/<button/g)||[]).length,1);assert.match(html,new RegExp('aria-expanded="'+expanded+'"'));assert.match(html,/aria-controls="api-controls"/);assert.match(html,/OpenAI · 已验证/);}
 setLanguage('en');try{const html=renderToStaticMarkup(<ApiConfigHeader expanded={false} controls="xfyun" onToggle={()=>{}} provider="科大讯飞" status="签名已验证"/>);assert.match(html,/Signature verified/);assert.doesNotMatch(html,/Account verified/);}finally{setLanguage('zh');}
});
test('face focus fades other points without changing coordinates or click selection',()=>{
 const points=Array.from({length:478},(_,i)=>({x:.2+(i%20)*.025,y:.2+Math.floor(i/20)*.02}));
 const html=renderToStaticMarkup(<PointPicker mode="face" points={points} selected={[13,14,61,291]} pair={false} dense compact onSelect={()=>{}}/>);
 assert.equal((html.match(/opacity="0.035"/g)||[]).length,474);assert.equal((html.match(/fill="#dc3545"/g)||[]).length,4);assert.equal((html.match(/opacity="0.95"/g)||[]).length,4);
 const all=renderToStaticMarkup(<PointPicker mode="face" points={points} selected={Array.from({length:478},(_,i)=>i)} pair={false} dense compact onSelect={()=>{}}/>);
 assert.equal((all.match(/r="1.5"/g)||[]).length,478);assert.equal((all.match(/stroke="none"/g)||[]).length,478);assert.ok(!all.includes('fill="#dc3545"'));
 let picked=-1;const item=PointPicker({mode:'face',points,selected:[13,14,61,291],dense:true,pair:false,onSelect:id=>{picked=id;}});const p=points[159];item.props.onPointerDown({currentTarget:{getBoundingClientRect:()=>({left:0,top:0,width:1000,height:750})},clientX:(1-p.x)*1000,clientY:p.y*750});assert.equal(picked,159);
});
test('selected face contours show lips, eyelids and brows as fine lines without duplicate base dots',()=>{
 const points=Array.from({length:478},()=>({x:.4,y:.5}));
 for(const focus of [[13,14,61,291],[33,133,145,159],[46,52,53,55,65,70,105,107]]){
 const html=renderToStaticMarkup(<Skeleton mode="face" points={points} focus={focus}/>);assert.ok(html.includes('data-face-contour="mouth"'));assert.ok(html.includes('data-face-contour="right-eye"'));assert.ok(html.includes('data-face-contour="right-brow"'));assert.ok(html.includes('<line'));assert.ok(!html.includes('<circle'));
 }
 const mouth=FACE_CONTOURS.find(g=>g.name==='mouth')!,brow=FACE_CONTOURS.find(g=>g.name==='right-brow')!;
 assert.ok(faceContourOpacity(mouth,[13,14,61,291])>faceContourOpacity(brow,[13,14,61,291]));assert.ok(facePointStyle(false,4,true).opacity<.05);
});
