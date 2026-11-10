import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanOscTarget,defaultOscTarget} from './osc';
import {newAudioProject,cleanAudioProject} from './audio';
import {newObjectProject,cleanObjectProject} from './objects';

test('OSC destinations round trip through visual and audio project files',()=>{
  const osc={host:'192.168.1.42',port:10001,address:'/music/filter'};
  const audio=cleanAudioProject({...newAudioProject('Level','volume'),effect:'osc',osc});
  const visual=cleanObjectProject({...newObjectProject('Trigger'),effect:'osc',osc});
  assert.deepEqual(audio.osc,osc);
  assert.deepEqual(visual.osc,osc);
  assert.equal(cleanAudioProject(newAudioProject('Old','volume')).osc,undefined);
});

test('OSC supports separate trigger and float paths and rejects malformed destinations',()=>{
  const config=defaultOscTarget(true);
  assert.equal(config.address,'/platform/value');
  assert.equal(defaultOscTarget(false).address,'/platform/trigger');
  for (const changes of [{address:'volume'},{port:65536},{port:0},{host:'192.168.300.1'},{host:'example.com'}]) {
    assert.throws(()=>cleanOscTarget({...config,...changes}));
  }
});

import {oscArgument,oscValue} from './osc';

test('OSC trigger mappings preserve text, integer and float wire types and the negative result',()=>{
  for (const type of ['string','integer','float'] as const) {
    const target=cleanOscTarget({...defaultOscTarget(false),trigger:{type,yes:'1',no:'0'}});
    assert.deepEqual(oscArgument('YES',target),{type,value:type==='string'?'1':1});
    assert.deepEqual(oscArgument('NO',target,false),{type,value:type==='string'?'0':0});
    assert.deepEqual(oscArgument(1,target),{type:'float',value:1});
    assert.deepEqual(cleanAudioProject({...newAudioProject('test','event'),effect:'osc',osc:target}).osc,target);
  }
  assert.deepEqual(oscArgument('Wave'),{type:'string',value:'Wave'});
  for (const raw of ['1.5','2147483648','-2147483649','YES','']) assert.throws(()=>oscValue('integer',raw));
  assert.throws(()=>oscValue('float','1e200'));
});
