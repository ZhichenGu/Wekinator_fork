import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {CreateChoices} from './CreateChoices';
import {ActionItem} from './ActionItem';
import {Skeleton} from './Skeleton';
import {Hand} from 'lucide-react';
import {setLanguage} from './i18n';
const modes={hand:{name:'手部追踪',description:'Hand',icon:Hand},face:{name:'面部追踪',description:'Face',icon:Hand},pose:{name:'身体追踪',description:'Body',icon:Hand}};
test('only coordinate output exposes single/dual choices; all five other interactions remain single-hand',()=>{
 for(const learning of ['dynamic','pose','continuous','region','relation','coordinates'] as const){
 const html=renderToStaticMarkup(<CreateChoices category="tracking" onCategory={()=>{}} mode="hand" onMode={()=>{}} learning={learning} onLearning={()=>{}} handTracking="dual" onHandTracking={()=>{}} visual="presence" onVisual={()=>{}} audio="keyword" onAudio={()=>{}} modes={modes}/>);
 assert.equal(html.includes('aria-label="坐标输出手数"'),learning==='coordinates');
 assert.equal(html.includes('双手</button>'),learning==='coordinates');
 assert.equal(html.includes('混合</button>'),false);
 assert.ok(html.includes('指尖停在指定区域'));assert.ok(html.includes('拇指与食指捏合'));assert.ok(html.includes('挥一次手'));
 }
});
test('English hand labels and dual replay preserve separate skeletons and anatomical labels',()=>{
 setLanguage('en');try{
 const html=renderToStaticMarkup(<ActionItem action={{id:'a',name:'My gesture',handCount:2,effect:'indicator',color:'#dddddd',samples:[],trained:false,threshold:.7}} handLabel="双手动作" index={0} selected disabled={false} renameDisabled={false} onSelect={()=>{}} onRename={()=>{}}/>);
 assert.match(html,/Two-hand action/);assert.match(html,/My gesture/);
 const skeleton=renderToStaticMarkup(<Skeleton mode="hand" points={Array.from({length:42},(_,i)=>({x:i<21?.2:.7,y:.5}))}/>);
 assert.equal((skeleton.match(/class="skeleton"/g)??[]).length,2);
 assert.ok(skeleton.includes('>L<'));assert.ok(skeleton.includes('>R<'));
 }finally{setLanguage('zh');}
});

test('deferred learning projects keep their original data and expose export instead of execution',async()=>{
 const {deferredHandLearning}=await import('./hand-learning');
 const {DeferredHandProject}=await import('./DeferredHandProject');
 const project={schemaVersion:1 as const,name:'Original joint project',mode:'hand' as const,feature:'both' as const,learning:'dynamic' as const,handTracking:'dual' as const,actions:[],updatedAt:'2026-11-14'};
 const before=JSON.stringify(project);
 assert.equal(deferredHandLearning(project),true);
 assert.equal(deferredHandLearning({...project,handTracking:'mixed'}),true);
 assert.equal(deferredHandLearning({...project,handTracking:'single'}),false);
 assert.equal(deferredHandLearning({...project,learning:'coordinates'}),false);
 const html=renderToStaticMarkup(<DeferredHandProject project={project} onBack={()=>{}}/>);
 assert.match(html,/导出项目/);assert.match(html,/暂缓开放/);assert.doesNotMatch(html,/>开始运行<|>开启摄像头<|>训练动作</);
 assert.equal(JSON.stringify(project),before);
});
