import test from 'node:test';import assert from 'node:assert/strict';import {methodHelp} from './method-help';import en from './locales/en.json';
test('all 15 tracking-method combinations explain checks, setup and output in both languages',()=>{
 const translations:Record<string,string>=en;
 for(const mode of ['hand','face','pose'] as const){for(const method of ['dynamic','pose','continuous','region','relation'] as const){const rows=methodHelp[mode][method];assert.equal(rows.length,3);for(const row of rows){assert.ok(row.length>10);assert.ok(translations[row]);}}}
 assert.match(methodHelp.hand.continuous[2],/0.12/);assert.match(methodHelp.hand.relation[2],/不是持续输出距离/);
 assert.match(methodHelp.face.region[0],/鼻尖/);assert.match(methodHelp.pose.region[0],/身体点/);
});
