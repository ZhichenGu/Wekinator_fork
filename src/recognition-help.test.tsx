import React from 'react';import test from 'node:test';import assert from 'node:assert/strict';import {renderToStaticMarkup} from 'react-dom/server';import {recognitionHelp} from './recognition-help';import {MethodChoice} from './MethodChoice';import en from './locales/en.json';
test('vision and audio help is translated and provider labels describe actual supported methods',()=>{
 const dictionary:Record<string,string>=en;
 for(const rows of Object.values(recognitionHelp)){assert.equal(rows.length,3);for(const row of rows)assert.ok(dictionary[row]);}
 assert.match(recognitionHelp.keyword[1],/APPID、APIKey、APISecret/);assert.match(recognitionHelp.event[1],/OpenAI/);assert.match(recognitionHelp.volume[1],/无需 API/);
 const html=renderToStaticMarkup(<MethodChoice title="语音关键词" help={recognitionHelp.keyword} provider="OpenAI / 科大讯飞" selected={false} onSelect={()=>{}}/>);
 assert.match(html,/悬停查看详情/);assert.match(html,/OpenAI \/ 科大讯飞/);assert.ok(!html.includes(recognitionHelp.keyword[0]));
});
