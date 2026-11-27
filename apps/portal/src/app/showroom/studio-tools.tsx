"use client";
import {useEffect,useRef,useState} from 'react';
import Image from 'next/image';
import {NyIcon,X,WifiOff,ChevronRight,History} from '@/components/icons';
import {roleLabels,type StaffIdentity} from '@/lib/staff-permissions';
import {staffWorkspaces} from '../workspace-list';
import StaffSignOut from '../staff-sign-out';
import {InstallWebApp,WorkspaceLink} from '../web-app';
import {useStudioDialogHistory} from './use-studio-dialog-history';
import {leaveStudioDialog} from '@/lib/studio-dialog-history';
export default function StudioTools({staff,welcome=false,onSalesHistory,workspace='studio'}:{staff:StaffIdentity;welcome?:boolean;onSalesHistory?:()=>void;
  /** NY Production reuses the Studio settings panel with its own name and workspace links. */
  workspace?:'studio'|'production'}){
  const appName=workspace==='production'?'NY Production':'NY Studio';const shortName=workspace==='production'?'Production':'Studio';
  const [open,setOpen]=useState(false);const [offline,setOffline]=useState(false);const dialog=useRef<HTMLDialogElement>(null);
  const workspaces=staffWorkspaces(staff).filter(item=>item.key!==workspace);
  const initials=staff.name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();
  useStudioDialogHistory(dialog,()=>setOpen(false),open);
  useEffect(()=>{if(open)dialog.current?.showModal();},[open]);
  useEffect(()=>{const update=()=>setOffline(!navigator.onLine);queueMicrotask(update);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
  return <>{!welcome&&<div className="studio-tools"><button type="button" className="showroom-secondary studio-settings-trigger" aria-label={`${shortName} settings`} title={`${shortName} settings`} onClick={()=>setOpen(true)}><NyIcon name="settings" size={19}/></button></div>}{offline&&<p className="studio-offline-banner" role="alert"><WifiOff size={17}/>You’re offline. Reconnect before saving a fitting or sale.</p>}
    {open&&<dialog ref={dialog} className="studio-tools-card" aria-label={`${shortName} settings`} onCancel={()=>setOpen(false)} onClick={event=>{if(event.target===event.currentTarget){const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)setOpen(false);}}}>
      <div className="inventory-form-title studio-settings-heading"><h2>{shortName} settings</h2><button type="button" aria-label={`Close ${shortName} settings`} onClick={()=>setOpen(false)}><X size={20}/></button></div>
      <section className="studio-settings-profile" aria-label="Signed-in staff account">
        <span className="studio-settings-avatar" aria-hidden="true"><Image src="/ny-wreath.svg" alt="" width={68} height={68}/><span>{initials}</span></span>
        <div className="studio-settings-identity"><strong>{staff.name}</strong><span>{roleLabels[staff.role]}</span><small>{staff.email}</small></div>
      </section>
      <section className="studio-settings-section" aria-labelledby="studio-settings-workspace"><h3 id="studio-settings-workspace">{shortName}</h3><div className="studio-settings-group">
        <InstallWebApp app={appName} settingsRow/>
        {onSalesHistory&&<button type="button" className="studio-settings-row" onClick={()=>leaveStudioDialog(window,onSalesHistory)}><History size={22}/><span>Sales history</span><ChevronRight size={18}/></button>}
      </div></section>
      {workspaces.length>0&&<section className="studio-settings-section" aria-labelledby="studio-settings-workspaces"><h3 id="studio-settings-workspaces">Workspaces</h3><div className="studio-settings-group">
        {workspaces.map(({key,label,href,Icon})=><WorkspaceLink key={key} className="studio-settings-row" href={href}><Icon size={22} aria-hidden="true"/><span>Open {label}</span><ChevronRight size={18}/></WorkspaceLink>)}
      </div></section>}
      <section className="studio-settings-section" aria-labelledby="studio-settings-session"><h3 id="studio-settings-session">Account</h3><div className="studio-settings-group"><StaffSignOut studio/></div></section>
    </dialog>}
  </>;
}
