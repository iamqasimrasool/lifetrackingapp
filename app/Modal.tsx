'use client';
import {useRef,useEffect,ReactNode} from 'react';
export default function Modal({title,closeLabel,children,onClose,busy=false}:{title:string,closeLabel:string,children:ReactNode,onClose:()=>void,busy?:boolean}){
 const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{const el=ref.current;const previous=document.activeElement as HTMLElement;el?.showModal();const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{el?.close();document.body.style.overflow=overflow;previous?.focus()}},[]);
 return <dialog className="vision-modal" ref={ref} aria-label={title} onCancel={e=>{e.preventDefault();if(!busy)onClose()}} onClick={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}><div><header><h2>{title}</h2><button type="button" aria-label={closeLabel} disabled={busy} onClick={onClose}>×</button></header>{children}</div></dialog>
}
