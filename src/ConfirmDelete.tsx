import { useEffect, useRef } from 'react';
export function ConfirmDelete({title,description,busy,onCancel,onConfirm}:{title:string;description:string;busy:boolean;onCancel:()=>void;onConfirm:()=>void}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const dialog=ref.current!;dialog.showModal();return ()=>dialog.close();},[]);
  return <dialog ref={ref} className="delete-dialog" aria-labelledby="delete-title" onCancel={e=>{e.preventDefault();if(!busy)onCancel();}}><h2 id="delete-title">{title}</h2><p>{description}</p><div><button className="secondary" autoFocus disabled={busy} onClick={onCancel}>取消</button><button className="primary" disabled={busy} onClick={onConfirm}>{busy?'正在删除…':'删除'}</button></div></dialog>;
}
