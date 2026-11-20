"use client";
import {useEffect,useRef,useState} from 'react';
import Image from 'next/image';
import {NyIcon,X,WifiOff,ChevronRight,History} from '@/components/icons';
import {can,officeAccessDeniedMessage,roleLabels,type StaffIdentity} from '@/lib/staff-permissions';
import StaffSignOut from '../staff-sign-out';
import {InstallWebApp,WorkspaceLink} from '../web-app';
import {useStudioDialogHistory} from './use-studio-dialog-history';
import {leaveStudioDialog} from '@/lib/studio-dialog-history';
export default function StudioTools({staff,welcome=false,onSalesHistory}:{staff:StaffIdentity;welcome?:boolean;onSalesHistory?:()=>void}){
  const [open,setOpen]=useState(false);const [offline,setOffline]=useState(false);const dialog=useRef<HTMLDialogElement>(null);
  const [officeDenied,setOfficeDenied]=useState(false);
  const initials=staff.name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();
  useStudioDialogHistory(dialog,()=>setOpen(false),open);
  useEffect(()=>{if(open)dialog.current?.showModal();},[open]);
  useEffect(()=>{const update=()=>setOffline(!navigator.onLine);queueMicrotask(update);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
  return <>{!welcome&&<div className="studio-tools"><button type="button" className="showroom-secondary studio-settings-trigger" aria-label="Studio settings" title="Studio settings" onClick={()=>setOpen(true)}><NyIcon name="settings" size={19}/></button></div>}{offline&&<p className="studio-offline-banner" role="alert"><WifiOff size={17}/>You’re offline. Reconnect before saving a fitting or sale.</p>}
    {open&&<dialog ref={dialog} className="studio-tools-card" aria-label="Studio settings" onCancel={()=>setOpen(false)} onClick={event=>{if(event.target===event.currentTarget){const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)setOpen(false);}}}>
      <div className="inventory-form-title studio-settings-heading"><h2>Studio settings</h2><button type="button" aria-label="Close Studio settings" onClick={()=>setOpen(false)}><X size={20}/></button></div>
      <section className="studio-settings-profile" aria-label="Signed-in staff account">
        <span className="studio-settings-avatar" aria-hidden="true"><Image src="/ny-wreath.svg" alt="" width={68} height={68}/><span>{initials}</span></span>
        <div className="studio-settings-identity"><strong>{staff.name}</strong><span>{roleLabels[staff.role]}</span><small>{staff.email}</small></div>
      </section>
      <section className="studio-settings-section" aria-labelledby="studio-settings-workspace"><h3 id="studio-settings-workspace">Studio</h3><div className="studio-settings-group">
        <InstallWebApp app="NY Studio" settingsRow/>
        {onSalesHistory&&<button type="button" className="studio-settings-row" onClick={()=>leaveStudioDialog(window,onSalesHistory)}><History size={22}/><span>Sales history</span><ChevronRight size={18}/></button>}
        {can(staff,'office') ? <WorkspaceLink className="studio-settings-row" href={staff.officeHref}><NyIcon name="grid" size={22}/><span>Open NY Office</span><ChevronRight size={18}/></WorkspaceLink> : <button type="button" className="studio-settings-row" aria-describedby={officeDenied?'studio-office-denied':undefined} onClick={()=>setOfficeDenied(true)}><NyIcon name="grid" size={22}/><span>Open NY Office</span><ChevronRight size={18}/></button>}
        {officeDenied&&<p className="studio-settings-access-message" id="studio-office-denied" role="alert">{officeAccessDeniedMessage}</p>}
      </div></section>
      <section className="studio-settings-section" aria-labelledby="studio-settings-session"><h3 id="studio-settings-session">Account</h3><div className="studio-settings-group"><StaffSignOut studio/></div></section>
    </dialog>}
  </>;
}
