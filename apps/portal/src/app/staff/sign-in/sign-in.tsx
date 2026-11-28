"use client";
import {signalStaffSessionChange} from '@/lib/staff-session-change';
import {workspaceNavigationHref} from '@/lib/workspace-navigation';
import Image from 'next/image';
import Link from 'next/link';
import '../password-recovery.css';
import {useState,type FormEvent} from 'react';
import {ArrowRight,LockKeyhole} from '@/components/icons';
import PasswordInput from "../../password-input";
export default function StaffSignIn({destination,initialError=''}:{destination:'office'|'studio';initialError?:string}){
  const [busy,setBusy]=useState(false);const [error,setError]=useState(initialError);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(busy)return;setBusy(true);setError('');const form=new FormData(event.currentTarget);try{const response=await fetch('/api/staff-auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:form.get('email'),password:form.get('password')})});const data=await response.json();if(!response.ok)throw new Error(data.message);signalStaffSessionChange();location.assign(workspaceNavigationHref(destination==='studio'?(data.staff.studioHref??'/showroom'):data.staff.officeHref,matchMedia('(display-mode: standalone)').matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone)));}catch(failure){setError(failure instanceof Error?failure.message:'Could not sign in.');setBusy(false);}}
  return <main className="staff-sign-in"><section className="staff-sign-in-card"><div className="staff-sign-in-brand"><Image src="/ny-mark.svg" alt="" width={52} height={52}/><span>NY ATELIER<small>STAFF ACCESS</small></span></div><p className="eyebrow">NY TEAM</p><h1>Welcome back.</h1><p>One staff account for every NY Atelier workspace. You’ll go straight to yours.</p><form method="post" action="/api/staff-sign-in" onSubmit={submit}><input type="hidden" name="next" value={destination}/><label>Staff email<input name="email" type="email" autoComplete="username" required maxLength={255}/></label><label>Password<PasswordInput name="password" autoComplete="current-password" required maxLength={255}/></label><Link prefetch={false} className="staff-recovery-link staff-forgot-link" href={`/staff/forgot-password?next=${destination}`}>Forgot password?</Link>{error&&<p role="alert" className="collection-error">{error}</p>}<button disabled={busy} type="submit">{busy?'Signing in…':'Sign in'}<ArrowRight size={18}/></button></form><p className="staff-sign-in-help"><LockKeyhole size={15}/>Access is assigned by NY Atelier. Contact your administrator if you need an account or a new setup link.</p></section></main>;
}
