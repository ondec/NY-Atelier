"use client";
import {signalStaffSessionChange} from '@/lib/staff-session-change';
import {useState} from 'react';
import {LogOut} from '@/components/icons';
export default function StaffSignOut({studio=false,iconOnly=false}:{studio?:boolean;iconOnly?:boolean}){const [busy,setBusy]=useState(false);return <button type="button" className={`staff-sign-out${iconOnly?' is-icon-only':''}`} aria-label={busy?'Signing out…':'Sign out'} title="Sign out" aria-busy={busy} disabled={busy} onClick={async()=>{setBusy(true);try{await fetch('/api/staff-auth/logout',{method:'POST'});}finally{signalStaffSessionChange();location.assign(new URL(`/staff/sign-in?next=${studio?'studio':'office'}`,location.origin));}}}><LogOut size={18}/>{!iconOnly&&<span>{busy?'Signing out…':'Sign out'}</span>}</button>;}
