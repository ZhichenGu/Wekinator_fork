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
