import React,{useEffect,useLayoutEffect,useRef,useState,type KeyboardEvent as ReactKeyboardEvent,type ReactNode} from 'react';
import {Settings2,X} from 'lucide-react';
import {t} from './i18n';
import {editableKeyTarget} from './trim';

export function WorkspaceSettings({sections,status,attention}:{attention?:{index:number;label:string};sections:{label:string;content:ReactNode}[];status:'ready'|'pending'|'error'}) {
  const outputIndex=sections.length-1;
  const attentionIndex=attention?.index??outputIndex;
  const [open,setOpen]=useState(false);
  const [tab,setTab]=useState(0);
  const trigger=useRef<HTMLButtonElement>(null), panel=useRef<HTMLElement>(null);
  const [preferredHeight,setPreferredHeight]=useState(410);
  const [limit,setLimit]=useState(410);
  const minimum=Math.min(210,limit);
  const height=Math.min(preferredHeight,limit);
  const drag=useRef<{id:number;offset:number}|null>(null);
  function resizeHeight(next:number) {
    setPreferredHeight(Math.max(minimum,Math.min(limit,Math.round(next))));
  }
  const statusText=attention?t(attention.label):t(status==='error'?'输出异常':status==='pending'?'输出待设置':'已就绪');
  const tabs=useRef<(HTMLButtonElement|null)[]>([]);
  function close(restoreFocus:boolean) {
    drag.current=null;
    setOpen(false);
    if(restoreFocus)trigger.current?.focus({preventScroll:true});
  }
  function toggle() {
    if(open){close(true);return;}
    if(status!=='ready')setTab(attentionIndex);
    setOpen(true);
  }

  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if(e.defaultPrevented||e.repeat||e.isComposing||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||document.querySelector('dialog[open]'))return;
      if(open&&e.key==='Escape'&&!editableKeyTarget(e.target)){e.preventDefault();close(true);return;}
      if(e.key.toLowerCase()==='p'&&!editableKeyTarget(e.target)){e.preventDefault();toggle();}
    };
    const outside=(e:PointerEvent)=>{
      if(open&&e.target instanceof Node&&!panel.current?.contains(e.target)&&!trigger.current?.contains(e.target))close(false);
    };
    window.addEventListener('keydown',onKey);
    document.addEventListener('pointerdown',outside);
    return ()=>{window.removeEventListener('keydown',onKey);document.removeEventListener('pointerdown',outside);};
  },[open,status,attentionIndex]);

  useLayoutEffect(()=>{
    const box=panel.current!, button=trigger.current!;
    const workspace=button.closest('main')!;
    const camera=workspace.querySelector('.camera-view,.object-preview,.audio-preview');
    // Keep the popover in the space beside, above or below the actual camera rectangle.
    const place=()=>{
      // Use the outer gutter even when audio reserves extra space on the left for settings.
      const left=workspace.getBoundingClientRect().left+parseFloat(getComputedStyle(workspace).paddingRight);
      button.style.left=left+'px';
      if(!open)return;
      const frame=camera?.getBoundingClientRect();
      const gap=8, bottom=button.getBoundingClientRect().top-gap;
      const leftSpace=frame?frame.left-left-gap:0;
      box.style.width=leftSpace>=236?Math.min(leftSpace,296)+'px':'';
      const overlapsHorizontally=leftSpace<236&&frame&&left+box.offsetWidth+gap>frame.left&&left<frame.right+gap;
      let topLimit=gap,end=bottom;
      if(frame&&overlapsHorizontally&&frame.bottom>gap&&frame.top<bottom){
        const above=frame.top-gap, below=frame.bottom+gap;
        if(bottom-below<180&&above-gap>bottom-below)end=above;
        else topLimit=below;
      }
      box.style.left=left+'px';
      box.style.bottom=(innerHeight-end)+'px';
      setLimit(Math.max(0,Math.floor(Math.min(innerHeight*.82,end-topLimit))));
    };
    place();
    const resize=new ResizeObserver(place);resize.observe(workspace);if(open&&camera)resize.observe(camera);resize.observe(button);
    document.addEventListener('scroll',place,true);window.addEventListener('resize',place);
    return ()=>{resize.disconnect();document.removeEventListener('scroll',place,true);window.removeEventListener('resize',place);};
  },[open]);

  function navigate(event:ReactKeyboardEvent<HTMLButtonElement>,index:number) {
    const next=event.key==='ArrowRight'?(index+1)%sections.length:event.key==='ArrowLeft'?(index+outputIndex)%sections.length:event.key==='Home'?0:event.key==='End'?outputIndex:null;
    if(next===null)return;
    event.preventDefault();setTab(next);tabs.current[next]?.focus({preventScroll:true});
  }
  return <>
    <button ref={trigger} type="button" className="hand-settings-trigger" aria-controls="hand-settings" aria-expanded={open} aria-keyshortcuts="P" aria-label={t('设置 · {0}',statusText)} onClick={toggle}>
      <i className={'dock-dot '+status}/><Settings2 size={16}/>{t('设置')}<kbd>P</kbd>
    </button>
    <aside id="hand-settings" ref={panel} hidden={!open} aria-label={t('设置')} className="hand-settings-panel" style={{height}}>
      <header>
        <div className="settings-resizer" role="slider" tabIndex={0} aria-orientation="vertical"
          aria-label={t('设置面板高度')} title={t('上下拖动调整高度')} aria-controls="hand-settings"
          aria-valuemin={minimum} aria-valuemax={limit} aria-valuenow={height}
          onPointerDown={e=>{
            if(e.button!==0||!e.isPrimary)return;
            const box=panel.current!.getBoundingClientRect();
            drag.current={id:e.pointerId,offset:e.clientY-box.top};
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={e=>{
            if(drag.current?.id!==e.pointerId)return;
            resizeHeight(panel.current!.getBoundingClientRect().bottom-e.clientY+drag.current.offset);
          }}
          onLostPointerCapture={()=>{drag.current=null;}}
          onKeyDown={e=>{
            const next={ArrowUp:height+32,ArrowDown:height-32,Home:minimum,End:limit}[e.key];
            if(next!==undefined){e.preventDefault();resizeHeight(next);}
          }}>
          <strong>{t('设置')}</strong>
        </div><button type="button" className="icon-button" aria-label={t('关闭设置')} onClick={()=>close(true)}><X size={17}/></button></header>
      <div role="tablist" aria-label={t('设置分类')}>{sections.map(({label:name},index)=><button key={name} ref={el=>{tabs.current[index]=el;}} type="button" role="tab" id={'setting-tab-'+index} aria-selected={tab===index} tabIndex={tab===index?0:-1} aria-controls={'hand-setting-'+index} onKeyDown={e=>navigate(e,index)} onClick={()=>setTab(index)}>
        {t(name)}{index===attentionIndex&&status!=='ready'&&<i className={'dock-dot '+status} aria-label={statusText}/>}
      </button>)}</div>
      {sections.map(({label,content},index)=><section key={label} role="tabpanel" tabIndex={0} aria-labelledby={'setting-tab-'+index} id={'hand-setting-'+index} hidden={tab!==index}>
        {index===attentionIndex&&status!=='ready'&&<p className="dock-output-status">{statusText}</p>}{content}
      </section>)}
    </aside>
  </>;
}
