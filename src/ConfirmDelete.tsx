import {t} from './i18n';
import {useEffect,useRef} from 'react';
export function ConfirmDelete({title,description,busy,onCancel,onConfirm}:{title:string;description:string;busy:boolean;onCancel:()=>void;onConfirm:()=>void}) {
  const ref=useRef<HTMLDialogElement>(null),confirm=useRef<HTMLButtonElement>(null);
  useEffect(()=>{const dialog=ref.current!;dialog.showModal();if(!confirm.current?.disabled)confirm.current?.focus();return ()=>dialog.close();},[]);
  return <dialog ref={ref} className="delete-dialog" aria-labelledby="delete-title" onCancel={e=>{e.preventDefault();if(!busy)onCancel();}}>
    <form onSubmit={e=>{e.preventDefault();if(!busy)onConfirm();}} onKeyDown={e=>{if(e.key==='Enter'&&(e.repeat||e.nativeEvent.isComposing||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey))e.preventDefault();}}>
      <h2 id="delete-title">{title}</h2><p>{description}</p><div><button type="button" className="secondary" disabled={busy} onClick={onCancel}>{t('取消')}</button><button ref={confirm} type="submit" className="primary" autoFocus disabled={busy}>{busy?t('正在删除…'):t('删除')}</button></div>
    </form>
  </dialog>;
}
